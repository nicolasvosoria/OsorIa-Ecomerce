import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/font-activation/route";

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

function makeCookieStore() {
  return {
    get: vi.fn(() => undefined),
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

describe("font activation admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
  });

  it("rejects non-admin users before writing app_fonts", async () => {
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
      new NextRequest("http://localhost/api/admin/font-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fontName: "Poppins",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado",
    });
    expect(serviceSchema.from).toHaveBeenCalledWith("user_profiles");
    expect(serviceSchema.from).not.toHaveBeenCalledWith("app_fonts");
  });

  it("writes font activation through service-role path for authenticated admins", async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const userProfilesQuery = makeUserProfilesQuery("admin");
    const findFontQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "font-1" }, error: null }),
    };
    const deactivateChain = {
      neq: vi.fn().mockResolvedValue({ error: null }),
    };
    const activateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const fontsTable = {
      select: vi.fn().mockReturnValue(findFontQuery),
      update: vi.fn((payload: { is_active?: boolean }) =>
        payload.is_active === false ? deactivateChain : activateChain,
      ),
    };

    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        if (table === "app_fonts") return fontsTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/font-activation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          fontName: "Poppins",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
    );
    expect(fontsTable.update).toHaveBeenCalledWith({ is_active: false });
    expect(fontsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true }),
    );
    expect(deactivateChain.neq).toHaveBeenCalledWith("is_active", false);
    expect(activateChain.eq).toHaveBeenCalledWith("font_name", "Poppins");
    expect(getUser).toHaveBeenCalledWith("preview-token");
  });
});
