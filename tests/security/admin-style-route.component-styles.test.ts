import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/component-styles/route";

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

function makeCanManageStoreRpc(
  decide: (userId: string, storeId: string) => boolean,
) {
  return vi.fn(
    async (fnName: string, params: { p_user_id: string; p_store_id: string }) => {
      if (fnName !== "can_user_manage_store") {
        throw new Error(`unexpected rpc ${fnName}`);
      }

      return { data: decide(params.p_user_id, params.p_store_id), error: null };
    },
  );
}

function makeExistingStyleQuery(existingId?: string) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: existingId ? { id: existingId } : null,
      error: null,
    }),
  };

  return chain;
}

function makeComponentStylesTable(updatedRow: Record<string, unknown>) {
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
  };

  return {
    select: vi.fn().mockReturnValue(makeExistingStyleQuery("style-1")),
    update: vi.fn().mockReturnValue(updateChain),
  };
}

function styleRequest(host = "localhost", token?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host,
  };
  if (token) headers.authorization = `Bearer ${token}`;

  return new NextRequest(`http://${host}/api/admin/component-styles`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      componentName: "header",
      variables: { bgColor: "#111111" },
    }),
  });
}

const UPDATED_ROW = {
  id: "style-1",
  component_name: "header",
  store_id: "store-1",
  variables: { bgColor: "#111111" },
  updated_at: "2026-04-17T12:00:00.000Z",
};

describe("component styles admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
  });

  it("rejects non-admin users before writing component styles", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    });

    const serviceSchema = {
      rpc: makeCanManageStoreRpc(() => false),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(styleRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado",
    });
    expect(serviceSchema.rpc).toHaveBeenCalledWith("can_user_manage_store", {
      p_user_id: "user-1",
      p_store_id: "store-1",
    });
    expect(serviceSchema.from).not.toHaveBeenCalledWith("component_styles");
  });

  it("writes through the service role path for authenticated admins", async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const componentStylesTable = makeComponentStylesTable(UPDATED_ROW);
    const serviceSchema = {
      rpc: makeCanManageStoreRpc(() => true),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(styleRequest("localhost", "preview-token"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: UPDATED_ROW });
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
    );
    expect(componentStylesTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { bgColor: "#111111" },
      }),
    );
    expect(getUser).toHaveBeenCalledWith("preview-token");
  });

  it("accepts cookie-backed admin requests without a bearer token", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "cookie-admin" } },
          error: null,
        }),
      },
    });

    const componentStylesTable = makeComponentStylesTable(UPDATED_ROW);
    const serviceSchema = {
      rpc: makeCanManageStoreRpc((userId) => userId === "cookie-admin"),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(styleRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: UPDATED_ROW });
  });

  it("accepts drifted bearer requests when the cookie identity is admin", async () => {
    const getUser = vi.fn().mockImplementation(async (token?: string) => {
      if (token === "preview-token") {
        return { data: { user: { id: "stale-user" } }, error: null };
      }

      return { data: { user: { id: "cookie-admin" } }, error: null };
    });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const componentStylesTable = makeComponentStylesTable(UPDATED_ROW);
    const serviceSchema = {
      rpc: makeCanManageStoreRpc((userId) => userId === "cookie-admin"),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(styleRequest("localhost", "preview-token"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: UPDATED_ROW });
    expect(getUser).toHaveBeenCalledWith("preview-token");
    expect(getUser).toHaveBeenCalledWith();
  });

  // Cross-tenant: the trusted store comes from the request host, never the
  // mutable store_id cookie. An admin bounded to store A cannot administer
  // store B by pointing the cookie at A while browsing B's subdomain; a
  // super_admin still can.
  it("denies a store-A admin from writing store B resolved by host, even with a cookie for A", async () => {
    cookies.mockResolvedValue(makeCookieStore("store-a"));
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-a" } },
          error: null,
        }),
      },
    });

    const storesLegacyQuery = makeStoresLegacyQuery("store-b");
    const serviceSchema = {
      rpc: makeCanManageStoreRpc(
        (userId, storeId) => userId === "admin-a" && storeId === "store-a",
      ),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return storesLegacyQuery;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(styleRequest("tiendab.osoria.tech"));

    expect(response.status).toBe(403);
    expect(storesLegacyQuery.eq).toHaveBeenCalledWith("subdomain", "tiendab");
    expect(serviceSchema.rpc).toHaveBeenCalledWith("can_user_manage_store", {
      p_user_id: "admin-a",
      p_store_id: "store-b",
    });
    expect(serviceSchema.from).not.toHaveBeenCalledWith("component_styles");
  });

  it("lets a super_admin write store B resolved by host", async () => {
    cookies.mockResolvedValue(makeCookieStore("store-a"));
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "super-admin" } },
          error: null,
        }),
      },
    });

    const storeBRow = { ...UPDATED_ROW, store_id: "store-b" };
    const componentStylesTable = makeComponentStylesTable(storeBRow);
    const serviceSchema = {
      rpc: makeCanManageStoreRpc((userId) => userId === "super-admin"),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-b");
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(styleRequest("tiendab.osoria.tech"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: storeBRow });
    expect(componentStylesTable.select().eq).toHaveBeenCalledWith(
      "store_id",
      "store-b",
    );
  });
});
