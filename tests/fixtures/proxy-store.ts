import { vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

export const defaultStore = {
  id: "84f0a892-cf12-4826-befd-cf64e1235123",
  subdomain: "default",
  store_name: "Tienda Principal",
  domain: "example.com",
  is_active: true,
  is_public: true,
};

export const tienda2Store = {
  id: "6bb5151b-9b9a-4794-a7b1-fb44df9f6aaa",
  subdomain: "tienda2",
  store_name: "Tienda Secundaria",
  domain: "tienda2.example.com",
  is_active: true,
  is_public: true,
};

export function makeProxyRequest(host: string) {
  return new NextRequest(`http://${host}/`, {
    headers: { host },
  });
}

export function mockStoreFetch(storesBySubdomain: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    const subdomain = url.searchParams
      .get("subdomain")
      ?.replace(/^eq\./, "");
    const body =
      subdomain && storesBySubdomain[subdomain]
        ? [storesBySubdomain[subdomain]]
        : [];

    return new Response(JSON.stringify(body), { status: 200 });
  });
}

// Next 16 hands the rendered page a modified request only when the proxy
// overrides its headers: `x-middleware-override-headers` lists the overridden
// names (comma-separated, lowercased) and each value travels in
// `x-middleware-request-<name>`. Without that list the page sees the inbound
// request headers untouched — spoofed values included — so the request is part
// of the answer, not just the response.
export function renderedRequestHeaders(
  request: NextRequest,
  response: NextResponse,
): Headers {
  const overriddenNames = response.headers.get("x-middleware-override-headers");
  if (overriddenNames === null) return new Headers(request.headers);

  return overriddenNames.split(",").reduce((headers, name) => {
    const value = response.headers.get(`x-middleware-request-${name}`);
    if (value !== null) headers.set(name, value);
    return headers;
  }, new Headers());
}

export function resetProxyModulesAndEnv() {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  delete process.env.DISABLE_SUBDOMAIN_MULTI_TENANT;
  delete process.env.DEFAULT_STORE_ID;
}
