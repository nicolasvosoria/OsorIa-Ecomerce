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
  defaultStore,
  makeProxyRequest,
  mockStoreFetch,
  resetProxyModulesAndEnv,
  tienda2Store,
} from "@/tests/fixtures/proxy-store";

// D3: every cookie in this repo is host-only (no `domain`). While the deploy
// lived on *.vercel.app, the Public Suffix List made that impossible to
// break; on osoria.help a `Domain=.osoria.help` is legal and the browser
// would honor it, leaking session and store_id across different tenants'
// subdomains. These tests freeze that stance now that the browser no longer
// enforces it on its own.

const { createServerClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({ cookies, headers: vi.fn() }));

import { getSupabaseAuthClient } from "@/lib/supabase/admin-route-auth";
import { getStoreFromServer } from "@/lib/supabase/store-api";
import { POST as postChatMessage } from "@/app/api/chat/route";

describe("proxy store_id cookie stays host-only", () => {
  beforeEach(() => {
    resetProxyModulesAndEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("carries no domain when multi-tenant is disabled", async () => {
    vi.stubEnv("DISABLE_SUBDOMAIN_MULTI_TENANT", "true");
    vi.stubGlobal("fetch", mockStoreFetch({}));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeProxyRequest("localhost:3000"));

    expect(response.cookies.get("store_id")?.value).toBe("default");
    expect(response.cookies.get("store_id")?.domain).toBeUndefined();
  });

  it("carries no domain for the resolved default store", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({ default: defaultStore }));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeProxyRequest("localhost:3000"));

    expect(response.cookies.get("store_id")?.value).toBe(defaultStore.id);
    expect(response.cookies.get("store_id")?.domain).toBeUndefined();
  });

  it("carries no domain when no default store exists", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({}));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeProxyRequest("localhost:3000"));

    expect(response.cookies.get("store_id")?.value).toBe("default");
    expect(response.cookies.get("store_id")?.domain).toBeUndefined();
  });

  it("carries no domain for a resolved tenant subdomain", async () => {
    vi.stubGlobal("fetch", mockStoreFetch({ tienda2: tienda2Store }));
    const { proxy } = await import("@/proxy");

    const response = await proxy(makeProxyRequest("tienda2.example.com"));

    expect(response.cookies.get("store_id")?.value).toBe(tienda2Store.id);
    expect(response.cookies.get("store_id")?.domain).toBeUndefined();
  });
});

describe("admin active-store cookie options stay host-only", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes no domain key alongside its expected attributes", async () => {
    const { cookieOptions } = await import("@/lib/admin/active-store-cookie");

    expect(cookieOptions).not.toHaveProperty("domain");
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe("lax");
    expect(cookieOptions.path).toBe("/");
  });

  it("stays domain-free while turning secure on in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { cookieOptions } = await import("@/lib/admin/active-store-cookie");

    expect(cookieOptions).not.toHaveProperty("domain");
    expect(cookieOptions.secure).toBe(true);
  });
});

// D3 continued: the SESSION cookie (Supabase auth) is written by three
// `@supabase/ssr` cookie adapters that spread library-supplied options
// straight into `cookieStore.set`. Those adapters are this repo's code, so
// what must stay frozen is that they never inject a `domain` of their own —
// not `@supabase/ssr`'s own cookie attributes, which are out of scope here.
describe("supabase session cookie adapters stay host-only", () => {
  type SessionCookieAdapter = {
    set: (name: string, value: string, options: Record<string, unknown>) => void;
    remove: (name: string, options: Record<string, unknown>) => void;
  };

  async function captureSessionCookieAdapter(
    driver: () => Promise<unknown>,
  ): Promise<{ cookieStore: { set: ReturnType<typeof vi.fn> }; adapter: SessionCookieAdapter }> {
    const cookieStore = { get: vi.fn(), set: vi.fn() };
    cookies.mockResolvedValue(cookieStore);

    let adapter: SessionCookieAdapter | undefined;
    createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: SessionCookieAdapter }) => {
        adapter = options.cookies;
        return {
          schema: () => {
            throw new Error("stub client: this test only drives the cookie adapter");
          },
        };
      },
    );

    await driver();

    if (!adapter) {
      throw new Error("createServerClient was never called; the adapter under test was not reached");
    }

    return { cookieStore, adapter };
  }

  function expectNoInjectedDomain(
    cookieStore: { set: ReturnType<typeof vi.fn> },
    adapter: SessionCookieAdapter,
  ) {
    adapter.set("sb-session", "token", {});
    adapter.remove("sb-session", {});

    expect(cookieStore.set).toHaveBeenCalledTimes(2);
    for (const [written] of cookieStore.set.mock.calls) {
      expect(written).not.toHaveProperty("domain");
    }
  }

  let errorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });

  it("admin-route-auth's session cookie adapter injects no domain", async () => {
    const { cookieStore, adapter } = await captureSessionCookieAdapter(() =>
      getSupabaseAuthClient(),
    );

    expectNoInjectedDomain(cookieStore, adapter);
  });

  it("store-api's session cookie adapter injects no domain", async () => {
    const { cookieStore, adapter } = await captureSessionCookieAdapter(() =>
      getStoreFromServer(),
    );

    expectNoInjectedDomain(cookieStore, adapter);
  });

  it("chat route's session cookie adapter injects no domain", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-deepseek-key");
    // Empty, not absent: forces getSupabaseServiceClient() to skip the
    // service-role path so the route falls back to the anon session client.
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { cookieStore, adapter } = await captureSessionCookieAdapter(() =>
      postChatMessage(
        new NextRequest("http://localhost/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: [{ sender: "user", text: "hola" }] }),
        }),
      ),
    );

    expectNoInjectedDomain(cookieStore, adapter);
  });
});
