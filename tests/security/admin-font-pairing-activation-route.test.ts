import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/font-pairing-activation/route";

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

describe("font pairing activation admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
  });

  it("rejects non-admin users before writing app_font_pairings", async () => {
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
      new NextRequest("http://localhost/api/admin/font-pairing-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pairingName: "todo-serif-heading-sans-body",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado",
    });
    expect(serviceSchema.from).toHaveBeenCalledWith("user_profiles");
    expect(serviceSchema.from).not.toHaveBeenCalledWith("app_font_pairings");
  });

  it("rejects requests without a pairingName before any admin check", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/font-pairing-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Payload inválido",
    });
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("returns 404 when the pairing does not exist", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
    });

    const userProfilesQuery = makeUserProfilesQuery("admin");
    const findPairingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const pairingsTable = {
      select: vi.fn().mockReturnValue(findPairingQuery),
      update: vi.fn(),
    };
    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        if (table === "app_font_pairings") return pairingsTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/font-pairing-activation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pairingName: "unknown-pairing" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Combinación de fuentes no encontrada",
    });
    expect(pairingsTable.update).not.toHaveBeenCalled();
  });

  it("flips is_active on app_font_pairings for authenticated admins", async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const userProfilesQuery = makeUserProfilesQuery("admin");
    const findPairingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "pairing-1" }, error: null }),
    };
    const deactivateChain = {
      neq: vi.fn().mockResolvedValue({ error: null }),
    };
    const activateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const pairingsTable = {
      select: vi.fn().mockReturnValue(findPairingQuery),
      update: vi.fn((payload: { is_active?: boolean }) =>
        payload.is_active === false ? deactivateChain : activateChain,
      ),
    };

    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        if (table === "app_font_pairings") return pairingsTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/font-pairing-activation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          pairingName: "todo-serif-heading-sans-body",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
    );
    expect(pairingsTable.update).toHaveBeenCalledWith({ is_active: false });
    expect(pairingsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true }),
    );
    expect(deactivateChain.neq).toHaveBeenCalledWith("is_active", false);
    expect(activateChain.eq).toHaveBeenCalledWith(
      "pairing_name",
      "todo-serif-heading-sans-body",
    );
    expect(getUser).toHaveBeenCalledWith("preview-token");
  });
});
