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

const defaultStore = {
  id: "84f0a892-cf12-4826-befd-cf64e1235123",
  subdomain: "default",
  store_name: "Tienda Principal",
  domain: "example.com",
  is_active: true,
  is_public: true,
};

const tienda2Store = {
  id: "6bb5151b-9b9a-4794-a7b1-fb44df9f6aaa",
  subdomain: "tienda2",
  store_name: "Tienda Secundaria",
  domain: "tienda2.example.com",
  is_active: true,
  is_public: true,
};

function makeRequest(host: string) {
  return new NextRequest(`http://${host}/`, {
    headers: { host },
  });
}

function mockStoreFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    const subdomain = url.searchParams
      .get("subdomain")
      ?.replace(/^eq\./, "");
    const body =
      subdomain === "default"
        ? [defaultStore]
        : subdomain === "tienda2"
          ? [tienda2Store]
          : [];

    return new Response(JSON.stringify(body), { status: 200 });
  });
}

describe("proxy store resolution", () => {
  let fetchMock: ReturnType<typeof mockStoreFetch>;
  let errorSpy: MockInstance;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = mockStoreFetch();
    vi.stubGlobal("fetch", fetchMock);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    delete process.env.DISABLE_SUBDOMAIN_MULTI_TENANT;
    delete process.env.DEFAULT_STORE_ID;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });

  it.each([
    ["localhost:3000"],
    ["127.0.0.1:3000"],
    ["0.0.0.0:3000"],
    ["192.168.1.20:3000"],
  ])("loads the default store for local/IP host %s", async (host) => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest(host));

    const requestedUrl = new URL(fetchMock.mock.calls[0][0].toString());
    expect(requestedUrl.searchParams.get("subdomain")).toBe("eq.default");
    expect(response.headers.get("x-store-subdomain")).toBe("default");
    expect(response.headers.get("x-store-name")).toBe("Tienda Principal");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it.each([
    ["tienda2.localhost:3000"],
    ["tienda2.example.com"],
  ])("loads the resolved subdomain store for host %s", async (host) => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeRequest(host));

    const requestedUrl = new URL(fetchMock.mock.calls[0][0].toString());
    expect(requestedUrl.searchParams.get("subdomain")).toBe("eq.tienda2");
    expect(response.headers.get("x-store-subdomain")).toBe("tienda2");
    expect(response.headers.get("x-store-name")).toBe("Tienda Secundaria");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
