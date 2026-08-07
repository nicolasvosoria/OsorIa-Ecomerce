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
import {
  renderedRequestHeaders,
  resetProxyModulesAndEnv,
} from "@/tests/fixtures/proxy-store";
import {
  NEUTRAL_PAGE_HEADER,
  NEUTRAL_PAGE_KIND,
  UNKNOWN_TENANT_HEADER,
  UNKNOWN_TENANT_VALUE,
} from "@/lib/stores/neutral-page";

const resolveAdminAccessMock = vi.fn();

vi.mock("@/lib/supabase/admin-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/admin-access")>();

  return {
    ...actual,
    resolveAdminAccess: resolveAdminAccessMock,
  };
});

// requesterManagesStore stays real: the cross-tenant denial below has to be the
// production rule, not a stub of it. Only the cookie session is faked.
const getUserMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: getUserMock } })),
}));

const unpublishedStore = {
  id: "7e85b9d6-768c-4cda-b1ce-cc091535a55c",
  subdomain: "tienda2",
  store_name: "Tienda Secundaria",
  domain: "tienda2.example.com",
  is_active: true,
  is_public: false,
};

const liveStore = { ...unpublishedStore, is_public: true };

const OWNER_OF_THIS_STORE = "3d0a1f5c-4f83-4b2f-9c0e-2a1b6d7e8f90";
const OWNER_OF_ANOTHER_STORE = "c41e9a72-58d6-4f0a-9e33-11b2c3d4e5f6";
const ANOTHER_STORE_ID = "9b7c6d5e-4f3a-4218-8b7c-6d5e4f3a2b1c";

const STORE_MANAGED_BY_USER: Record<string, string> = {
  [OWNER_OF_THIS_STORE]: unpublishedStore.id,
  [OWNER_OF_ANOTHER_STORE]: ANOTHER_STORE_ID,
};

const MANAGE_STORE_RPC_PATH = "/rpc/can_user_manage_store";

function makeRequest(pathname: string) {
  const host = "tienda2.example.com";
  return new NextRequest(`http://${host}${pathname}`, { headers: { host } });
}

function signInAs(userId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: userId } }, error: null });
}

// Reproduce the production deadlock: the stores RLS policy (is_active AND
// is_public) hides an unpublished store from the anon key, so only a request
// carrying the service role key gets the row back. The same stub answers
// can_user_manage_store the way the database does — per store, so a user only
// ever gets `true` for the store he actually manages.
function mockStoreFetch(store: { is_public: boolean } | null) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input.toString());

    if (url.pathname.endsWith(MANAGE_STORE_RPC_PATH)) {
      const userId = url.searchParams.get("p_user_id") ?? "";
      const manages = STORE_MANAGED_BY_USER[userId] === url.searchParams.get("p_store_id");
      return new Response(JSON.stringify(manages), { status: 200 });
    }

    const headers = (init?.headers ?? {}) as Record<string, string>;
    const usesServiceRole = headers.apikey === "test-service-role";
    const rlsHidesStore = store !== null && !store.is_public && !usesServiceRole;
    const body = store && !rlsHidesStore ? [store] : [];

    return new Response(JSON.stringify(body), { status: 200 });
  });
}

function manageStoreRpcCalls(fetchMock: ReturnType<typeof mockStoreFetch>) {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input).includes(MANAGE_STORE_RPC_PATH),
  );
}

describe("proxy store publication gate", () => {
  let errorSpy: MockInstance;

  beforeEach(() => {
    resetProxyModulesAndEnv();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    resolveAdminAccessMock.mockReset();
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "owner-1" });
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
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

  // Anonymous traffic to an unpublished store — visitors, crawlers, scanners —
  // must not pay for the theme preview specifically: no RPC round-trip, and
  // no SECOND session read beyond D22's own global gate (proxy.ts's
  // isInvitedPendingPassword, which now reads the session once for every
  // non-public request, admin or not — see tests/proxy/invited-session-gate
  // .test.ts for that gate's own coverage).
  it("does no theme-preview authorization work for a storefront request without the preview marker", async () => {
    const fetchMock = mockStoreFetch(unpublishedStore);
    vi.stubGlobal("fetch", fetchMock);
    const { proxy } = await import("@/proxy");

    await proxy(makeRequest("/"));

    expect(getUserMock).toHaveBeenCalledTimes(1);
    expect(manageStoreRpcCalls(fetchMock)).toHaveLength(0);
  });

  it("still rewrites an anonymous preview request: the marker alone is not a key", async () => {
    const fetchMock = mockStoreFetch(unpublishedStore);
    vi.stubGlobal("fetch", fetchMock);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/?themePreview=1"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-inactive");
    expect(manageStoreRpcCalls(fetchMock)).toHaveLength(0);
  });

  it("lets the manager of this store preview its unpublished storefront", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    signInAs(OWNER_OF_THIS_STORE);
    const { proxy } = await import("@/proxy");

    const request = makeRequest("/?themePreview=1");
    const response = await proxy(request);

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get(NEUTRAL_PAGE_HEADER)).toBeNull();
    expect(renderedRequestHeaders(request, response).get("x-store-id")).toBe(
      unpublishedStore.id,
    );
  });

  it("lets the manager of this store preview its unpublished /shop", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    signInAs(OWNER_OF_THIS_STORE);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/shop?themePreview=1"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-store-id")).toBe(unpublishedStore.id);
  });

  // The whole point of gating on the store-scoped can_user_manage_store instead
  // of "manages any store": owning a tenant is not a pass into another tenant's
  // pre-launch catalogue.
  it("denies the preview to the manager of a DIFFERENT store", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    signInAs(OWNER_OF_ANOTHER_STORE);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/?themePreview=1"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-inactive");
  });

  it("denies the /shop preview to the manager of a DIFFERENT store", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    signInAs(OWNER_OF_ANOTHER_STORE);
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/shop?themePreview=1"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-inactive");
  });

  it("asks can_user_manage_store about the store the host resolved to", async () => {
    const fetchMock = mockStoreFetch(unpublishedStore);
    vi.stubGlobal("fetch", fetchMock);
    signInAs(OWNER_OF_ANOTHER_STORE);
    const { proxy } = await import("@/proxy");

    await proxy(makeRequest("/?themePreview=1"));

    const [rpcCall] = manageStoreRpcCalls(fetchMock);
    const params = new URL(String(rpcCall[0])).searchParams;
    expect(params.get("p_store_id")).toBe(unpublishedStore.id);
    expect(params.get("p_user_id")).toBe(OWNER_OF_ANOTHER_STORE);
  });

  it("propagates the store identity to the page that renders /store-inactive", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    const { proxy } = await import("@/proxy");

    const request = makeRequest("/");
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(renderedHeaders.get("x-store-id")).toBe(unpublishedStore.id);
    expect(renderedHeaders.get("x-store-subdomain")).toBe(unpublishedStore.subdomain);
    expect(renderedHeaders.get("x-store-name")).toBe(unpublishedStore.store_name);
    expect(renderedHeaders.get(NEUTRAL_PAGE_HEADER)).toBe(NEUTRAL_PAGE_KIND.storeInactive);
  });

  it("sets the store_id cookie of the unpublished store as a host-only cookie", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(unpublishedStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/"));

    const storeCookie = response.cookies.get("store_id");
    expect(storeCookie?.value).toBe(unpublishedStore.id);
    expect(storeCookie?.domain).toBeUndefined();
  });

  it("rewrites a missing store to /store-not-found", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(null));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-not-found");
  });

  it("marks the request of a missing store as an unknown tenant and claims no identity", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(null));
    const { proxy } = await import("@/proxy");

    const request = makeRequest("/");
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(renderedHeaders.get(UNKNOWN_TENANT_HEADER)).toBe(UNKNOWN_TENANT_VALUE);
    expect(renderedHeaders.get(NEUTRAL_PAGE_HEADER)).toBe(NEUTRAL_PAGE_KIND.storeNotFound);
    expect(renderedHeaders.get("x-store-id")).toBeNull();
    expect(response.cookies.get("store_id")).toBeUndefined();
  });

  it("serves a live store storefront with its resolved headers", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(liveStore));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest("/"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-store-id")).toBe(liveStore.id);
    expect(response.headers.get("x-store-subdomain")).toBe("tienda2");
  });

  it("never marks a live storefront as a neutral page", async () => {
    vi.stubGlobal("fetch", mockStoreFetch(liveStore));
    const { proxy } = await import("@/proxy");

    const request = makeRequest("/");
    const response = await proxy(request);

    expect(response.headers.get(NEUTRAL_PAGE_HEADER)).toBeNull();
    expect(renderedRequestHeaders(request, response).get(NEUTRAL_PAGE_HEADER)).toBeNull();
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
