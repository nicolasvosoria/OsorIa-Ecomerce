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

function makeCanManageStoreRpc(decide: (userId: string) => boolean) {
  return vi.fn(async (fnName: string, params: { p_user_id: string }) => {
    if (fnName !== "can_user_manage_store") {
      throw new Error(`unexpected rpc ${fnName}`);
    }

    return { data: decide(params.p_user_id), error: null };
  });
}

describe("theme activation admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
  });

  it("rejects non-admin users before writing app_theme_versions", async () => {
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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/theme-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          themeName: "Claro Original",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado",
    });
    expect(serviceSchema.rpc).toHaveBeenCalledWith("can_user_manage_store", {
      p_user_id: "user-1",
      p_store_id: "store-1",
    });
    expect(serviceSchema.from).not.toHaveBeenCalledWith("app_theme_versions");
  });

  it("includes safe diagnostics for permission verification failures when debug header is enabled", async () => {
    const getUser = vi.fn().mockImplementation(async (token?: string) => {
      if (token === "preview-token") {
        return { data: { user: { id: "bearer-user" } }, error: null };
      }

      return { data: { user: { id: "cookie-admin" } }, error: null };
    });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const profileError = {
      code: "42501",
      message: "permission denied for function can_user_manage_store",
      hint: "Check RLS policy",
    };
    const serviceSchema = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: profileError }),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/theme-activation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
          "x-osoria-admin-debug": "1",
        },
        body: JSON.stringify({
          themeName: "Claro Original",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Error verificando permisos",
      diagnostics: {
        bearerPresent: true,
        cookieAuthUserExists: true,
        candidateUserIds: ["bearer-user", "cookie-admin"],
        profileQuery: {
          schema: "ecommerce",
          table: "user_profiles",
        },
        profileError,
      },
    });
    expect(serviceSchema.rpc).toHaveBeenCalledWith("can_user_manage_store", {
      p_user_id: "bearer-user",
      p_store_id: "store-1",
    });
    expect(serviceSchema.from).not.toHaveBeenCalledWith("app_themes");
  });

  it("writes theme activation through service-role path for authenticated admins", async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const canManageRpc = makeCanManageStoreRpc(() => true);
    const themeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "theme-1",
          theme_name: "Claro Original",
          updated_at: "2026-05-14T10:00:00Z",
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
    const currentVersionQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const deactivateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const themeVersionsTable = {
      update: vi.fn(() => deactivateChain),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue(currentVersionQuery),
    };

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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/theme-activation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          themeName: "Claro Original",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      activeTheme: expect.objectContaining({
        theme_name: "Claro Original",
        theme_fingerprint: expect.stringMatching(/^v1:store-1:.+:theme-1:/),
      }),
    });
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
    );
    // Insert-not-upsert: activation never updates an existing version row,
    // it only ever flips every row for the store to not-current, then
    // inserts a brand new one — so history accumulates on every apply.
    expect(themeVersionsTable.update).toHaveBeenCalledTimes(1);
    expect(themeVersionsTable.update).toHaveBeenCalledWith({
      is_current: false,
    });
    expect(themeVersionsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: "store-1",
        theme_id: "theme-1",
        is_current: true,
        is_custom: false,
        variables: expect.objectContaining({
          colorsLight: expect.objectContaining({ primary: "#111111" }),
          colorsDark: expect.any(Object),
          radius: expect.any(Object),
          density: expect.any(Object),
          shadow: expect.any(Object),
          shape: expect.any(Object),
        }),
        fonts: { fontPairingId: null },
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

    const canManageRpc = makeCanManageStoreRpc(() => true);
    const themeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: "theme-1" }, error: null }),
    };
    const currentVersionQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const deactivateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const themeVersionsTable = {
      update: vi.fn(() => deactivateChain),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue(currentVersionQuery),
    };
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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/theme-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          themeName: "Claro Original",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
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

    const canManageRpc = makeCanManageStoreRpc(
      (userId) => userId === "cookie-admin",
    );
    const themeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: "theme-1" }, error: null }),
    };
    const currentVersionQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const deactivateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const themeVersionsTable = {
      update: vi.fn(() => deactivateChain),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue(currentVersionQuery),
    };
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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/theme-activation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          themeName: "Claro Original",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(getUser).toHaveBeenCalledWith("preview-token");
    expect(getUser).toHaveBeenCalledWith();
  });

  it("persists an arbitrary custom definition as a new is_custom version anchored to its base preset", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    });

    const canManageRpc = makeCanManageStoreRpc(() => true);
    const themeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: "theme-tech" }, error: null }),
    };
    const currentVersionQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const deactivateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const themeVersionsTable = {
      update: vi.fn(() => deactivateChain),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue(currentVersionQuery),
    };
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

    const colors = {
      primary: "#101010",
      secondary: "#202020",
      accent: "#303030",
      background: "#ffffff",
      foreground: "#0a0a0a",
      card: "#f5f5f5",
      cardForeground: "#101010",
      border: "#dedede",
      muted: "#eeeeee",
      mutedForeground: "#444444",
    };
    const customDefinition = {
      colorsLight: colors,
      colorsDark: { ...colors, background: "#0a0a0a", foreground: "#ffffff" },
      radius: { base: "0.5rem" },
      density: { scale: 1 },
      shadow: { card: "0 1px 2px rgba(0,0,0,.1)", elevated: "0 4px 8px rgba(0,0,0,.2)" },
      shape: { button: "9999px", card: "1rem" },
      fontPairingId: "custom-pairing",
    };

    const response = await POST(
      new NextRequest("http://localhost/api/admin/theme-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          themeName: "Tech",
          baseThemeName: "Tech",
          definition: customDefinition,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(themeVersionsTable.update).toHaveBeenCalledTimes(1);
    expect(themeVersionsTable.update).toHaveBeenCalledWith({
      is_current: false,
    });
    expect(themeVersionsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        theme_id: "theme-tech",
        is_current: true,
        is_custom: true,
        variables: expect.objectContaining({
          colorsLight: colors,
          fontPairingId: "custom-pairing",
        }),
        fonts: { fontPairingId: "custom-pairing" },
      }),
    );
  });

  it("rejects a malformed custom definition before writing any row", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    });

    const serviceSchema = {
      from: vi.fn((table: string) => {
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/theme-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          themeName: "Tech",
          baseThemeName: "Tech",
          definition: { colorsLight: { primary: "#101010" } },
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Payload inválido",
    });
    expect(serviceSchema.from).not.toHaveBeenCalled();
  });
});
