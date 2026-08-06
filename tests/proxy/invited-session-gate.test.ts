import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const defaultStore = {
  id: "84f0a892-cf12-4826-befd-cf64e1235123",
  subdomain: "default",
  store_name: "Tienda Principal",
  domain: "example.com",
  is_active: true,
  is_public: true,
};

const isInvitedPendingPasswordMock = vi.fn();
const resolveAdminAccessMock = vi.fn();

vi.mock("@/lib/auth/invited-session-gate", () => ({
  isInvitedPendingPassword: isInvitedPendingPasswordMock,
}));

vi.mock("@/lib/supabase/admin-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/admin-access")>();

  return {
    ...actual,
    resolveAdminAccess: resolveAdminAccessMock,
  };
});

function makeRequest(pathname: string, host = "localhost:3000") {
  return new NextRequest(`http://${host}${pathname}`, { headers: { host } });
}

function mockStoreFetch() {
  return vi.fn(async () => new Response(JSON.stringify([defaultStore]), { status: 200 }));
}

// D22: a new invited session (D20's native invite, before it sets a real
// password) is globally limited to invite consumption, password setup and
// logout -- every route, not just /admin. These prove the gate proxy.ts
// applies BEFORE any other branch: it never even reaches the admin gate or
// the tenant store lookup for a route it must reject.
describe("proxy D22 invited-session gate", () => {
  let fetchMock: ReturnType<typeof mockStoreFetch>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = mockStoreFetch();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    delete process.env.DISABLE_SUBDOMAIN_MULTI_TENANT;
    delete process.env.DEFAULT_STORE_ID;
    isInvitedPendingPasswordMock.mockReset();
    resolveAdminAccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("redirects an invited-pending session away from /admin to the setup page", async () => {
    isInvitedPendingPasswordMock.mockResolvedValue(true);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin/orders"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth/accept-invite");
    // The redirect fires before any store or admin-access lookup runs.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resolveAdminAccessMock).not.toHaveBeenCalled();
  });

  it("redirects an invited-pending session away from the storefront root too, not just /admin", async () => {
    isInvitedPendingPasswordMock.mockResolvedValue(true);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth/accept-invite");
  });

  it("redirects an invited-pending session on the platform admin host too", async () => {
    isInvitedPendingPasswordMock.mockResolvedValue(true);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/", "admin.osoria.help"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.osoria.help/auth/accept-invite");
  });

  it("lets the invited-pending session reach its own setup page without a redirect loop", async () => {
    isInvitedPendingPasswordMock.mockResolvedValue(true);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/auth/accept-invite"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects a session that is not invited-pending", async () => {
    isInvitedPendingPasswordMock.mockResolvedValue(false);
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "owner-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin/orders"));

    expect(response.headers.get("location")).toBeNull();
  });
});
