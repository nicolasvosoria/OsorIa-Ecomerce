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

type RestStubs = {
  profile?: Response | (() => Response);
  storeAccess?: Response | (() => Response);
};

function stubRest({ profile, storeAccess }: RestStubs) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const stub = url.includes("/rpc/user_manages_any_store") ? storeAccess : profile;
      if (!stub) {
        throw new Error(`unstubbed REST call: ${url}`);
      }
      return typeof stub === "function" ? stub() : stub;
    }),
  );
}

function profileRole(role: string | null) {
  return () => new Response(JSON.stringify(role ? [{ role }] : []), { status: 200 });
}

function managesAnyStore(manages: boolean) {
  return () => new Response(JSON.stringify(manages), { status: 200 });
}

function lookupFailure() {
  return () => new Response(JSON.stringify({ message: "boom" }), { status: 500 });
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

  it("returns admin for a global admin that manages no store", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    stubRest({ profile: profileRole("admin"), storeAccess: managesAnyStore(false) });
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "admin",
      userId: "admin-1",
    });
  });

  it("returns admin for a global 'user' that owns a store", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "store-owner-1" } }, error: null });
    stubRest({ profile: profileRole("user"), storeAccess: managesAnyStore(true) });
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "admin",
      userId: "store-owner-1",
    });
  });

  it("returns non_admin for an authenticated user that manages no store", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "customer-1" } }, error: null });
    stubRest({ profile: profileRole("customer"), storeAccess: managesAnyStore(false) });
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "non_admin",
      userId: "customer-1",
    });
  });

  it("returns error when the service-role profile lookup fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    stubRest({ profile: lookupFailure(), storeAccess: managesAnyStore(false) });
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "error",
      userId: "admin-1",
      reason: "profile_lookup_failed",
    });
  });

  it("returns error when the store access lookup fails instead of falling back to the role", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "store-owner-1" } }, error: null });
    stubRest({ profile: profileRole("user"), storeAccess: lookupFailure() });
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await expect(resolveAdminAccess(makeRequest())).resolves.toEqual({
      status: "error",
      userId: "store-owner-1",
      reason: "store_access_lookup_failed",
    });
  });

  it("asks ecommerce.user_manages_any_store over GET with the ecommerce profile header", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "store-owner-1" } }, error: null });
    stubRest({ profile: profileRole("user"), storeAccess: managesAnyStore(true) });
    const { resolveAdminAccess } = await import("@/lib/supabase/admin-access");

    await resolveAdminAccess(makeRequest());

    const rpcCall = vi.mocked(fetch).mock.calls.find(([url]) =>
      String(url).includes("/rpc/user_manages_any_store"),
    );
    expect(rpcCall?.[0]).toBe(
      "https://test.supabase.co/rest/v1/rpc/user_manages_any_store?p_user_id=store-owner-1",
    );
    expect(rpcCall?.[1]?.method).toBeUndefined();
    expect((rpcCall?.[1]?.headers as Record<string, string>)["Accept-Profile"]).toBe("ecommerce");
  });
});
