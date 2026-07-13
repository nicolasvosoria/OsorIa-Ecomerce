import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/theme-activation/route";

const { createServerClient, createClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("next/headers", () => ({
  cookies,
}));

function makeCookieStore(storeId = "store-1") {
  return {
    get: vi.fn((name: string) => {
      if (name === "store_id") {
        return { value: storeId };
      }

      return undefined;
    }),
    set: vi.fn(),
  };
}

function makeStoresLegacyQuery(storeId: string) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: { id: storeId }, error: null }),
  };

  return chain;
}

function makeCanManageStoreRpc(canManage: boolean) {
  return vi.fn(async (fnName: string) => {
    if (fnName !== "can_user_manage_store") {
      throw new Error(`unexpected rpc ${fnName}`);
    }

    return { data: canManage, error: null };
  });
}

// Mocks the two distinct `select(...).eq(...).maybeSingle()` shapes the route
// issues against `app_theme_versions` during a revert: the existence check
// (`select("id")`) and the post-revert `readConfirmedActiveTheme` lookup
// (`select("id, store_id, theme_id, created_at")`).
function makeThemeVersionsTable(options: {
  existingVersion?: { id: string } | null;
  currentVersionAfterRevert?: {
    id: string;
    store_id: string;
    theme_id: string;
    created_at: string;
  } | null;
} = {}) {
  const {
    existingVersion = { id: "version-1" },
    currentVersionAfterRevert = {
      id: "version-1",
      store_id: "store-1",
      theme_id: "theme-1",
      created_at: "2026-01-01T00:00:00Z",
    },
  } = options;

  const existsChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existingVersion, error: null }),
  };
  const currentChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: currentVersionAfterRevert, error: null }),
  };

  const select = vi.fn((columns: string) =>
    columns === "id" ? existsChain : currentChain,
  );

  const deactivateEq = vi.fn().mockResolvedValue({ error: null });
  const activateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn((payload: { is_current: boolean }) => ({
    eq: payload.is_current ? activateEq : deactivateEq,
  }));

  return { select, update, existsChain, currentChain, deactivateEq, activateEq };
}

function makeThemeQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: "theme-1",
        theme_name: "Claro Original",
        colors: {
          primary: "#111111",
          secondary: "#222222",
          accent: "#333333",
          background: "#ffffff",
          foreground: "#000000",
          card: "#f5f5f5",
          cardForeground: "#101010",
          border: "#dedede",
          muted: "#eeeeee",
          mutedForeground: "#444444",
        },
      },
      error: null,
    }),
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/theme-activation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("theme activation route: revert (D3, Option A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
    });
  });

  it("flips is_current onto the target version instead of inserting a new row", async () => {
    const canManageRpc = makeCanManageStoreRpc(true);
    const themeVersionsTable = makeThemeVersionsTable();
    const themeQuery = makeThemeQuery();
    const insert = vi.fn();

    const serviceSchema = {
      rpc: canManageRpc,
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "app_themes") return themeQuery;
        if (table === "app_theme_versions")
          return { ...themeVersionsTable, insert };
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      makeRequest({ versionId: "version-1" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      activeTheme: expect.objectContaining({ theme_name: "Claro Original" }),
    });

    // Deactivate-all, then activate-one: exactly two updates, never an insert.
    expect(themeVersionsTable.update).toHaveBeenCalledTimes(2);
    expect(themeVersionsTable.update).toHaveBeenNthCalledWith(1, {
      is_current: false,
    });
    expect(themeVersionsTable.deactivateEq).toHaveBeenCalledWith(
      "store_id",
      "store-1",
    );
    expect(themeVersionsTable.update).toHaveBeenNthCalledWith(2, {
      is_current: true,
    });
    expect(themeVersionsTable.activateEq).toHaveBeenCalledWith(
      "id",
      "version-1",
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 404 for a foreign or absent versionId and never writes", async () => {
    const canManageRpc = makeCanManageStoreRpc(true);
    const themeVersionsTable = makeThemeVersionsTable({ existingVersion: null });

    const serviceSchema = {
      rpc: canManageRpc,
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "app_theme_versions") return themeVersionsTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      makeRequest({ versionId: "someone-elses-version" }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Versión no encontrada",
    });
    expect(themeVersionsTable.existsChain.eq).toHaveBeenCalledWith(
      "id",
      "someone-elses-version",
    );
    expect(themeVersionsTable.existsChain.eq).toHaveBeenCalledWith(
      "store_id",
      "store-1",
    );
    expect(themeVersionsTable.update).not.toHaveBeenCalled();
  });

  it("never touches component_styles during a revert", async () => {
    const canManageRpc = makeCanManageStoreRpc(true);
    const themeVersionsTable = makeThemeVersionsTable();
    const themeQuery = makeThemeQuery();
    const componentStylesTable = {
      select: vi.fn(() => {
        throw new Error("component_styles should not be touched on revert");
      }),
      update: vi.fn(() => {
        throw new Error("component_styles should not be touched on revert");
      }),
    };

    const serviceSchema = {
      rpc: canManageRpc,
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "app_themes") return themeQuery;
        if (table === "app_theme_versions") return themeVersionsTable;
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(makeRequest({ versionId: "version-1" }));

    expect(response.status).toBe(200);
    expect(componentStylesTable.select).not.toHaveBeenCalled();
    expect(componentStylesTable.update).not.toHaveBeenCalled();
  });

  it("rejects non-admin revert requests before checking the version", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    });

    const canManageRpc = makeCanManageStoreRpc(false);
    const serviceSchema = {
      rpc: canManageRpc,
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(makeRequest({ versionId: "version-1" }));

    expect(response.status).toBe(403);
    expect(serviceSchema.from).not.toHaveBeenCalledWith("app_theme_versions");
  });

  it("skips the apply-payload validation when versionId is present", async () => {
    const canManageRpc = makeCanManageStoreRpc(true);
    const themeVersionsTable = makeThemeVersionsTable();
    const themeQuery = makeThemeQuery();

    const serviceSchema = {
      rpc: canManageRpc,
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "app_themes") return themeQuery;
        if (table === "app_theme_versions") return themeVersionsTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    // No `themeName`/`baseThemeName`/`definition` at all — a bare revert.
    const response = await POST(makeRequest({ versionId: "version-1" }));

    expect(response.status).toBe(200);
  });
});
