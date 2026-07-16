import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { NextRequest } from "next/server";

const resolveAdminAccessMock = vi.fn();

vi.mock("@/lib/supabase/admin-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/admin-access")>();

  return {
    ...actual,
    resolveAdminAccess: resolveAdminAccessMock,
  };
});

const unpublishedStore = {
  id: "7e85b9d6-768c-4cda-b1ce-cc091535a55c",
  subdomain: "tienda2",
  store_name: "Tienda Secundaria",
  domain: "tienda2.example.com",
  is_active: true,
  is_public: false,
};

const liveStore = { ...unpublishedStore, is_public: true };

function makeRequest(pathname: string) {
  const host = "tienda2.example.com";
  return new NextRequest(`http://${host}${pathname}`, { headers: { host } });
}

// Reproduce the production deadlock: the stores RLS policy (is_active AND
// is_public) hides an unpublished store from the anon key, so only a request
// carrying the service role key gets the row back.
function mockStoreFetch(store: { is_public: boolean } | null) {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const usesServiceRole = headers.apikey === "test-service-role";
    const rlsHidesStore = store !== null && !store.is_public && !usesServiceRole;
    const body = store && !rlsHidesStore ? [store] : [];

    return new Response(JSON.stringify(body), { status: 200 });
  });
}

describe("proxy store publication gate", () => {
  let errorSpy: MockInstance;

  beforeEach(() => {
    vi.resetModules();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    delete process.env.DISABLE_SUBDOMAIN_MULTI_TENANT;
    delete process.env.DEFAULT_STORE_ID;
    resolveAdminAccessMock.mockReset();
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "owner-1" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });

  it("lets the owner of an unpublished store reach /admin through the route gate", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/admin/products"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-store-id")).toBe(unpublishedStore.id);
    expect(resolveAdminAccessMock).toHaveBeenCalledTimes(1);
  });

  it("lets the owner of an unpublished store reach the forced password change screen", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/auth/force-password-change"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-store-id")).toBe(unpublishedStore.id);
    expect(resolveAdminAccessMock).not.toHaveBeenCalled();
  });

  it("lets /dashboard through on an unpublished store so its redirect to /admin can run", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/dashboard"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-store-id")).toBe(unpublishedStore.id);
  });

  it("rewrites the storefront of an unpublished store to /store-inactive", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-inactive");
    expect(resolveAdminAccessMock).not.toHaveBeenCalled();
  });

  it("still rewrites a non-journey storefront path of an unpublished store to /store-inactive", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/shop"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-inactive");
    expect(resolveAdminAccessMock).not.toHaveBeenCalled();
  });

  it("rewrites a missing store to /store-not-found", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(null));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-not-found");
  });

  it("serves a live store storefront with its resolved headers", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(liveStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-store-id")).toBe(liveStore.id);
    expect(response.headers.get("x-store-subdomain")).toBe("tienda2");
  });

  it("resolves the store with the service role key so RLS cannot hide it", async () => {
    const fetchMock = mockStoreFetch(unpublishedStore);
    vi.stubGlobal("fetch", fetchMock);
    const { proxy } = await import("@/proxy");

    await proxy(makeRequest("/"));

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;
    expect(headers.apikey).toBe("test-service-role");
    expect(headers.Authorization).toBe("Bearer test-service-role");
  });
});
