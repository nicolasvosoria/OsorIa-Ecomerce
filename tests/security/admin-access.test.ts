import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

function makeRequest(pathname = "/admin/orders") {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: { host: "localhost:3000" },
  });
}

describe("admin access resolver", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
    getUserMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ["/admin/orders", "/admin/orders"],
    ["/admin/orders?status=open", "/admin/orders?status=open"],
    ["//evil.com/admin", null],
    ["https://evil.com/admin", null],
    ["/auth/callback?next=/admin", null],
    ["/?admin_access=denied", null],
  ])("normalizes safe admin return target %s", async (input, expected) => {
    const { normalizeSafeAdminPath } = await import("@/lib/supabase/admin-access");

    expect(normalizeSafeAdminPath(input)).toBe(expected);
  });

  it("returns guest when Supabase auth has no current user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "guest",
      reason: "no_user",
    });
  });

  it("returns admin for a user with ecommerce.user_profiles.role admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ role: "admin" }]), { status: 200 })),
    );
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "admin",
      userId: "admin-1",
    });
  });

  it("returns non_admin for an authenticated non-admin profile", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "customer-1" } }, error: null });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ role: "customer" }]), { status: 200 })),
    );
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "non_admin",
      userId: "customer-1",
    });
  });

  it("returns error when the service-role profile lookup fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 })),
    );
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "error",
      userId: "admin-1",
      reason: "profile_lookup_failed",
    });
  });
});
