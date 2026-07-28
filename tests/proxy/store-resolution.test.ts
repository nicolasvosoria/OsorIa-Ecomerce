import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import {
  defaultStore,
  makeProxyRequest,
  mockStoreFetch,
  resetProxyModulesAndEnv,
  tienda2Store,
} from "@/tests/fixtures/proxy-store";

describe("proxy store resolution", () => {
  let fetchMock: ReturnType<typeof mockStoreFetch>;
  let errorSpy: MockInstance;

  beforeEach(() => {
    resetProxyModulesAndEnv();
    fetchMock = mockStoreFetch({ default: defaultStore, tienda2: tienda2Store });
    vi.stubGlobal("fetch", fetchMock);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

    const response = await proxy(makeProxyRequest(host));

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

    const response = await proxy(makeProxyRequest(host));

    const requestedUrl = new URL(fetchMock.mock.calls[0][0].toString());
    expect(requestedUrl.searchParams.get("subdomain")).toBe("eq.tienda2");
    expect(response.headers.get("x-store-subdomain")).toBe("tienda2");
    expect(response.headers.get("x-store-name")).toBe("Tienda Secundaria");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
