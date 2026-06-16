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

const resolveAdminAccessMock = vi.fn();

vi.mock("@/lib/supabase/admin-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/admin-access")>();

  return {
    ...actual,
    resolveAdminAccess: resolveAdminAccessMock,
  };
});

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: { host: "localhost:3000" },
  });
}

function mockStoreFetch() {
  return vi.fn(async () => new Response(JSON.stringify([defaultStore]), { status: 200 }));
}

describe("proxy admin route guard", () => {
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

  it("redirects a guest /admin/orders request before render with login intent", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "guest" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin/orders"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?auth=login&next=%2Fadmin%2Forders",
    );
  });

  it("redirects a non-admin safely with denied feedback", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "non_admin", userId: "customer-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin/orders"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?admin_access=denied",
    );
  });

  it("passes an admin through while preserving store headers and cookies", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "admin-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin/orders"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-store-id")).toBe(defaultStore.id);
    expect(response.headers.get("x-store-subdomain")).toBe("default");
    expect(response.headers.get("set-cookie")).toContain(`store_id=${defaultStore.id}`);
  });

  it("treats an expired or missing user as a login redirect", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "guest", reason: "no_user" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?auth=login&next=%2Fadmin",
    );
  });

  it("redirects lookup and service errors to safe error feedback", async () => {
    resolveAdminAccessMock.mockResolvedValue({ status: "error", reason: "profile_lookup_failed" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin/orders"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?admin_access=error",
    );
  });

  it.each(["/", "/checkout", "/dashboard"])(
    "leaves %s unaffected by the admin proxy gate",
    async (path) => {
      const { proxy } = await import("@/proxy");

      const response = await proxy(makeRequest(path));

      expect(resolveAdminAccessMock).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-store-subdomain")).toBe("default");
    },
  );
});
