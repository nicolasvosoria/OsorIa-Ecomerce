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

function makeUserProfilesQuery(role: string | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({ data: role ? { role } : null, error: null }),
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
});
