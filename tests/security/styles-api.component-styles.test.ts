import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getComponentStyles,
  updateComponentStyle,
} from "@/lib/supabase/styles-api";
import {
  getSupabaseBrowserClient,
  getSupabaseEcommerce,
} from "@/lib/supabase/client";
import { requireAdmin } from "@/lib/supabase/permissions-api";
import { getRuntimeStoreId } from "@/lib/utils/store";

vi.mock("@/lib/supabase/permissions-api", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/utils/store", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/utils/store")>(
      "@/lib/utils/store",
    );

  return {
    ...actual,
    getRuntimeStoreId: vi.fn(),
  };
});

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedGetSupabaseBrowserClient = vi.mocked(getSupabaseBrowserClient);
const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);
const mockedGetRuntimeStoreId = vi.mocked(getRuntimeStoreId);

function createSelectQuery(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => void) => resolve(result),
  };

  return chain;
}

describe("component styles admin client contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue();
    mockedGetRuntimeStoreId.mockResolvedValue("store-1");
    mockedGetSupabaseBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "live-admin" } },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "preview-token",
              user: { id: "live-admin" },
            },
          },
        }),
        refreshSession: vi.fn(),
      },
    } as any);
    mockedGetSupabaseEcommerce.mockImplementation(() => {
      throw new Error("browser client write path should not be used");
    });
  });

  it("loads default-store styles when the runtime store id is symbolic in local dev", async () => {
    mockedGetRuntimeStoreId.mockResolvedValue(null);

    const defaultStoreQuery = createSelectQuery({
      data: { id: "default-store-uuid" },
      error: null,
    });
    const stylesQuery = createSelectQuery({
      data: [
        {
          id: "style-hero",
          component_name: "hero",
          store_id: "default-store-uuid",
          variables: { title: "Manual hero" },
          updated_at: "2026-06-16T12:00:00.000Z",
        },
      ],
      error: null,
    });
    const ecommerceClient = {
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return defaultStoreQuery;
        if (table === "component_styles_legacy") return stylesQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockedGetSupabaseEcommerce.mockReturnValue(ecommerceClient as any);

    await expect(getComponentStyles()).resolves.toEqual([
      {
        id: "style-hero",
        component_name: "hero",
        store_id: "default-store-uuid",
        variables: { title: "Manual hero" },
        updated_at: "2026-06-16T12:00:00.000Z",
      },
    ]);

    expect(defaultStoreQuery.eq).toHaveBeenCalledWith("subdomain", "default");
    expect(stylesQuery.eq).toHaveBeenCalledWith(
      "store_id",
      "default-store-uuid",
    );
  });

  it("routes component style saves through the admin API instead of browser table writes", async () => {
    const payload = {
      id: "style-1",
      component_name: "header",
      store_id: "store-1",
      variables: { bgColor: "#111111" },
      updated_at: "2026-04-17T12:00:00.000Z",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: payload }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateComponentStyle("header", { bgColor: "#111111" }),
    ).resolves.toEqual(payload);

    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/component-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer preview-token",
      },
      body: JSON.stringify({
        componentName: "header",
        variables: { bgColor: "#111111" },
      }),
    });
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("surfaces API errors without falling back to direct browser writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Acceso denegado" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateComponentStyle("header", { bgColor: "#111111" }),
    ).rejects.toThrow("Acceso denegado");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("omits the bearer header when no session token is available", async () => {
    mockedGetSupabaseBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        refreshSession: vi.fn(),
      },
    } as any);

    const payload = {
      id: "style-1",
      component_name: "header",
      store_id: "store-1",
      variables: { bgColor: "#111111" },
      updated_at: "2026-04-17T12:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: payload }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateComponentStyle("header", { bgColor: "#111111" }),
    ).resolves.toEqual(payload);

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/component-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        componentName: "header",
        variables: { bgColor: "#111111" },
      }),
    });
  });

  it("refreshes a stale session when requireAdmin validated a different live user", async () => {
    const refreshSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "recovered-token",
          user: { id: "live-admin" },
        },
      },
    });

    mockedGetSupabaseBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "live-admin" } },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "stale-token",
              user: { id: "stale-user" },
            },
          },
        }),
        refreshSession,
      },
    } as any);

    const payload = {
      id: "style-1",
      component_name: "header",
      store_id: "store-1",
      variables: { bgColor: "#111111" },
      updated_at: "2026-04-17T12:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: payload }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateComponentStyle("header", { bgColor: "#111111" }),
    ).resolves.toEqual(payload);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/component-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer recovered-token",
      },
      body: JSON.stringify({
        componentName: "header",
        variables: { bgColor: "#111111" },
      }),
    });
  });
});
