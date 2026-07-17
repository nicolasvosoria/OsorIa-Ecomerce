import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tienda2Store = {
  id: "6bb5151b-9b9a-4794-a7b1-fb44df9f6aaa",
  subdomain: "tienda2",
  store_name: "Tienda Secundaria",
  domain: "tienda2.example.com",
  is_active: true,
  is_public: true,
};

const resolveAdminAccessMock = vi.fn();

vi.mock("@/lib/supabase/admin-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/admin-access")>();

  return {
    ...actual,
    resolveAdminAccess: resolveAdminAccessMock,
  };
});

function makeRequest(host: string, pathname: string) {
  return new NextRequest(`http://${host}${pathname}`, {
    headers: { host },
  });
}

function mockStoreFetch() {
  return vi.fn(async () => new Response(JSON.stringify([tienda2Store]), { status: 200 }));
}

describe("proxy platform admin host", () => {
  let fetchMock: ReturnType<typeof mockStoreFetch>;
  let restoreConsoleError: () => void;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = mockStoreFetch();
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    restoreConsoleError = () => errorSpy.mockRestore();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    delete process.env.DISABLE_SUBDOMAIN_MULTI_TENANT;
    delete process.env.DEFAULT_STORE_ID;
    resolveAdminAccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    restoreConsoleError();
  });

  it.each([
    ["/", "/admin/stores"],
    ["/create", "/admin/stores/create"],
    ["/users", "/admin/stores/users"],
    ["/6bb5151b-9b9a-4794-a7b1-fb44df9f6aaa", "/admin/stores/6bb5151b-9b9a-4794-a7b1-fb44df9f6aaa"],
  ])("rewrites the clean route %s to %s for an admin", async (pathname, consolePath) => {
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "admin-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("admin.localhost:3000", pathname));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `http://admin.localhost:3000${consolePath}`,
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("never emits store headers, store cookies, or store lookups on the admin host", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "admin-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("admin.localhost:3000", "/"));

    expect(response.headers.get("x-store-id")).toBeNull();
    expect(response.headers.get("x-store-subdomain")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects any route outside the platform tier to the console", async () => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("admin.localhost:3000", "/ruta-cualquiera/x"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/");
    expect(resolveAdminAccessMock).not.toHaveBeenCalled();
  });

  it("sends a guest to the dedicated login on the same host", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "guest", reason: "no_user" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("admin.localhost:3000", "/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://admin.localhost:3000/auth/login",
    );
  });

  it("lets the auth journey pass without rewrites or gates", async () => {
    const { proxy } = await import("@/proxy");

    for (const pathname of ["/auth/login", "/auth/callback", "/dashboard"]) {
      const response = await proxy(makeRequest("admin.localhost:3000", pathname));

      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get("location")).toBeNull();
    }
    expect(resolveAdminAccessMock).not.toHaveBeenCalled();
  });

  it("expels a non-admin to the deployment root host with denied feedback", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "non_admin", userId: "customer-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("admin.localhost:3000", "/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?admin_access=denied",
    );
  });

  it("keeps serving the console when multi-tenant is disabled by flag", async () => {
    process.env.DISABLE_SUBDOMAIN_MULTI_TENANT = "true";
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "admin-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("admin.localhost:3000", "/"));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/stores",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["tienda2.localhost:3000", "/admin/stores", "http://admin.localhost:3000/"],
    ["tienda2.localhost:3000", "/admin/stores/create", "http://admin.localhost:3000/create"],
    ["tienda2.localhost:3000", "/admin/stores/users", "http://admin.localhost:3000/users"],
    ["tienda2.example.com", "/admin/stores", "http://admin.example.com/"],
    ["localhost:3000", "/admin/stores", "http://admin.localhost:3000/"],
  ])("301s the old console bookmark %s%s to %s", async (host, pathname, location) => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest(host, pathname));

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(location);
  });

  it("leaves the store dashboard /admin untouched on store hosts", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "admin-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("tienda2.localhost:3000", "/admin"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-store-subdomain")).toBe("tienda2");
  });
});
