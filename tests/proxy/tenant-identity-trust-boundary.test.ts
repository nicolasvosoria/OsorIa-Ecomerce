import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  mockStoreFetch,
  renderedRequestHeaders,
  resetProxyModulesAndEnv,
  tienda2Store,
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

const unpublishedStore = { ...tienda2Store, is_public: false };

// The identity of a store the caller does not own, sent by hand on the request.
const spoofedIdentity = {
  "x-store-id": "11111111-2222-4333-8444-555555555555",
  "x-store-subdomain": "tienda-ajena",
  "x-store-name": "Tienda Ajena",
};

function makeSpoofedRequest(host: string, pathname: string) {
  return new NextRequest(`http://${host}${pathname}`, {
    headers: { host, ...spoofedIdentity },
  });
}

function makeRequestWithForgedHeader(host: string, pathname: string, name: string, value: string) {
  return new NextRequest(`http://${host}${pathname}`, {
    headers: { host, [name]: value },
  });
}

describe("proxy tenant identity trust boundary", () => {
  beforeEach(() => {
    resetProxyModulesAndEnv();
    resolveAdminAccessMock.mockReset();
    resolveAdminAccessMock.mockResolvedValue({ status: "admin", userId: "admin-1" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("serves a live storefront the identity the proxy minted, not the spoofed one", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({ tienda2: tienda2Store }));
    const { proxy } = await import("@/proxy");

    const request = makeSpoofedRequest("tienda2.example.com", "/");
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(renderedHeaders.get("x-store-id")).toBe(tienda2Store.id);
    expect(renderedHeaders.get("x-store-subdomain")).toBe(tienda2Store.subdomain);
    expect(renderedHeaders.get("x-store-name")).toBe(tienda2Store.store_name);
  });

  it("does not let a forged neutral-page marker survive on a live store path", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({ tienda2: tienda2Store }));
    const { proxy } = await import("@/proxy");

    const request = makeRequestWithForgedHeader(
      "tienda2.example.com",
      "/",
      NEUTRAL_PAGE_HEADER,
      NEUTRAL_PAGE_KIND.storeInactive,
    );
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(renderedHeaders.get(NEUTRAL_PAGE_HEADER)).toBeNull();
  });

  it("does not let a forged unknown-tenant marker survive on a live store path", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({ tienda2: tienda2Store }));
    const { proxy } = await import("@/proxy");

    const request = makeRequestWithForgedHeader(
      "tienda2.example.com",
      "/",
      UNKNOWN_TENANT_HEADER,
      UNKNOWN_TENANT_VALUE,
    );
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(renderedHeaders.get(UNKNOWN_TENANT_HEADER)).toBeNull();
  });

  it("keeps emitting the resolved identity as response headers", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({ tienda2: tienda2Store }));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeSpoofedRequest("tienda2.example.com", "/"));

    expect(response.headers.get("x-store-id")).toBe(tienda2Store.id);
    expect(response.headers.get("x-store-subdomain")).toBe(tienda2Store.subdomain);
    expect(response.headers.get("x-store-name")).toBe(tienda2Store.store_name);
  });

  it("overwrites the spoofed identity with the real store on /store-inactive", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({ tienda2: unpublishedStore }));
    const { proxy } = await import("@/proxy");

    const request = makeSpoofedRequest("tienda2.example.com", "/");
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(response.headers.get("x-middleware-rewrite")).toContain("/store-inactive");
    expect(renderedHeaders.get("x-store-id")).toBe(unpublishedStore.id);
    expect(renderedHeaders.get("x-store-subdomain")).toBe(unpublishedStore.subdomain);
    expect(renderedHeaders.get("x-store-name")).toBe(unpublishedStore.store_name);
    expect(renderedHeaders.get(NEUTRAL_PAGE_HEADER)).toBe(NEUTRAL_PAGE_KIND.storeInactive);
  });

  it("lets no identity at all reach /store-not-found", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({}));
    const { proxy } = await import("@/proxy");

    const request = makeSpoofedRequest("tienda-fantasma.example.com", "/");
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(renderedHeaders.get(UNKNOWN_TENANT_HEADER)).toBe(UNKNOWN_TENANT_VALUE);
    expect(renderedHeaders.get(NEUTRAL_PAGE_HEADER)).toBe(NEUTRAL_PAGE_KIND.storeNotFound);
    expect(renderedHeaders.get("x-store-id")).toBeNull();
    expect(renderedHeaders.get("x-store-subdomain")).toBeNull();
    expect(renderedHeaders.get("x-store-name")).toBeNull();
  });

  it("lets no identity at all reach the platform console (D4)", async () => {
    const fetchMock = mockStoreFetch({ tienda2: tienda2Store });
    vi.stubGlobal("fetch", fetchMock);
    const { proxy } = await import("@/proxy");

    const request = makeSpoofedRequest("admin.localhost:3000", "/");
    const response = await proxy(request);
    const renderedHeaders = renderedRequestHeaders(request, response);

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/stores",
    );
    expect(renderedHeaders.get("x-store-id")).toBeNull();
    expect(response.headers.get("x-store-id")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
