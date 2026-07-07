import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/admin/theme-versions/route";

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
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({
      data: role ? { role } : null,
      error: null,
    }),
  };

  return chain;
}

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/theme-versions", {
    method: "GET",
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("theme versions admin route", () => {
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

  it("rejects non-admin users before reading any version", async () => {
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

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(serviceSchema.from).not.toHaveBeenCalledWith("app_theme_versions");
  });

  it("returns this store's versions newest-first, labeled with their base theme name, without exposing variables/fonts", async () => {
    const userProfilesQuery = makeUserProfilesQuery("admin");
    const versionRows = [
      {
        id: "version-2",
        theme_id: "theme-tech",
        is_current: true,
        is_custom: true,
        created_at: "2026-02-01T00:00:00Z",
      },
      {
        id: "version-1",
        theme_id: "theme-tech",
        is_current: false,
        is_custom: false,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const themeVersionsTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: versionRows, error: null }),
    };
    const appThemesTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: "theme-tech", theme_name: "Tech" }],
        error: null,
      }),
    };

    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        if (table === "app_theme_versions") return themeVersionsTable;
        if (table === "app_themes") return appThemesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      versions: [
        {
          id: "version-2",
          isCurrent: true,
          isCustom: true,
          createdAt: "2026-02-01T00:00:00Z",
          baseThemeName: "Tech",
        },
        {
          id: "version-1",
          isCurrent: false,
          isCustom: false,
          createdAt: "2026-01-01T00:00:00Z",
          baseThemeName: "Tech",
        },
      ],
    });
    expect(themeVersionsTable.eq).toHaveBeenCalledWith("store_id", "store-1");
    expect(themeVersionsTable.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });
});
