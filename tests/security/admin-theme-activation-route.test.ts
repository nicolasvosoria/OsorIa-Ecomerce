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

function makeUserProfilesQuery(
  role: string | null | Record<string, string | null>,
) {
  let currentId: string | null = null;
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((column: string, value: string) => {
      if (column === "id") {
        currentId = value;
      }

      return chain;
    }),
    single: vi.fn().mockImplementation(async () => {
      const resolvedRole =
        typeof role === "string" || role === null
          ? role
          : currentId
            ? (role[currentId] ?? null)
            : null;

      return {
        data: resolvedRole ? { role: resolvedRole } : null,
        error: null,
      };
    }),
  };

  return chain;
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

    const userProfilesQuery = makeUserProfilesQuery("user");
    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
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
    expect(serviceSchema.from).toHaveBeenCalledWith("user_profiles");
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
      message: 'permission denied for table "user_profiles"',
      hint: "Check RLS policy",
    };
    const userProfilesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: profileError }),
    };
    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
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
    expect(serviceSchema.from).toHaveBeenCalledWith("user_profiles");
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

    const userProfilesQuery = makeUserProfilesQuery("admin");
    const themeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: "theme-1" }, error: null }),
    };
    const existingQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "version-1" }, error: null }),
    };
    const deactivateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const activateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const themeVersionsTable = {
      update: vi.fn((payload: { is_current?: boolean }) =>
        payload.is_current === false ? deactivateChain : activateChain,
      ),
      select: vi.fn().mockReturnValue(existingQuery),
    };

    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
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
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
    );
    expect(themeVersionsTable.update).toHaveBeenCalledWith({
      is_current: false,
    });
    expect(themeVersionsTable.update).toHaveBeenCalledWith({
      is_current: true,
    });
    expect(activateChain.eq).toHaveBeenCalledWith("id", "version-1");
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

    const userProfilesQuery = makeUserProfilesQuery("admin");
    const themeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: "theme-1" }, error: null }),
    };
    const existingQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "version-1" }, error: null }),
    };
    const deactivateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const activateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const themeVersionsTable = {
      update: vi.fn((payload: { is_current?: boolean }) =>
        payload.is_current === false ? deactivateChain : activateChain,
      ),
      select: vi.fn().mockReturnValue(existingQuery),
    };
    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
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

    const userProfilesQuery = makeUserProfilesQuery({
      "stale-user": "user",
      "cookie-admin": "admin",
    });
    const themeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: "theme-1" }, error: null }),
    };
    const existingQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "version-1" }, error: null }),
    };
    const deactivateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const activateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const themeVersionsTable = {
      update: vi.fn((payload: { is_current?: boolean }) =>
        payload.is_current === false ? deactivateChain : activateChain,
      ),
      select: vi.fn().mockReturnValue(existingQuery),
    };
    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
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
});
