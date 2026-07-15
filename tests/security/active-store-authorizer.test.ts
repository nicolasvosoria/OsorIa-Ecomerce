import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, createClient, cookies, headers } = vi.hoisted(
  () => ({
    createServerClient: vi.fn(),
    createClient: vi.fn(),
    cookies: vi.fn(),
    headers: vi.fn(),
  }),
);

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("next/headers", () => ({ cookies, headers }));

import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import {
  ACTIVE_STORE_COOKIE,
  signActiveStore,
  verifyActiveStore,
} from "@/lib/admin/active-store-cookie";

const COOKIE_STORE = "store-from-cookie";
const HOST_STORE = "store-from-host";

function mockAuthUser(userId: string | null) {
  createServerClient.mockReturnValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function mockCookies(activeStoreValue?: string) {
  cookies.mockResolvedValue({
    get: vi.fn((name: string) =>
      name === ACTIVE_STORE_COOKIE && activeStoreValue
        ? { value: activeStoreValue }
        : undefined,
    ),
    set: vi.fn(),
  });
}

function mockHostHeader(host = "myshop.example.com") {
  headers.mockResolvedValue({
    get: vi.fn((name: string) => (name === "host" ? host : null)),
  });
}

function mockServiceClient(manageableStores: Record<string, boolean>) {
  const storesLegacyChain: any = {
    select: vi.fn(() => storesLegacyChain),
    eq: vi.fn(() => storesLegacyChain),
    single: vi
      .fn()
      .mockResolvedValue({ data: { id: HOST_STORE }, error: null }),
  };

  const serviceSchema = {
    rpc: vi.fn(async (fnName: string, params: { p_store_id: string }) => {
      if (fnName !== "can_user_manage_store") {
        throw new Error(`unexpected rpc ${fnName}`);
      }

      return { data: manageableStores[params.p_store_id] === true, error: null };
    }),
    from: vi.fn((table: string) => {
      if (table !== "stores_legacy") {
        throw new Error(`unexpected table ${table}`);
      }

      return storesLegacyChain;
    }),
  };

  createClient.mockReturnValue({
    schema: vi.fn().mockReturnValue(serviceSchema),
  });

  return serviceSchema;
}

describe("authorizeActiveStoreAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.ADMIN_COOKIE_SECRET = "test-cookie-secret";
    delete process.env.DISABLE_SUBDOMAIN_MULTI_TENANT;
    mockHostHeader();
  });

  it("resolves the cookie store when its signature is valid and manageable", async () => {
    mockAuthUser("admin-1");
    mockCookies(signActiveStore(COOKIE_STORE));
    mockServiceClient({ [COOKIE_STORE]: true, [HOST_STORE]: true });

    const result = await authorizeActiveStoreAdmin();

    expect(result).toEqual({
      supabase: expect.anything(),
      storeId: COOKIE_STORE,
      userId: "admin-1",
    });
  });

  it("falls back to the host store when the cookie store is not manageable", async () => {
    mockAuthUser("admin-1");
    mockCookies(signActiveStore(COOKIE_STORE));
    mockServiceClient({ [COOKIE_STORE]: false, [HOST_STORE]: true });

    const result = await authorizeActiveStoreAdmin();

    expect(result).toMatchObject({ storeId: HOST_STORE, userId: "admin-1" });
  });

  it("ignores a tampered cookie signature and uses the host store", async () => {
    mockAuthUser("admin-1");
    mockCookies(`${COOKIE_STORE}.deadbeef`);
    mockServiceClient({ [COOKIE_STORE]: true, [HOST_STORE]: true });

    const result = await authorizeActiveStoreAdmin();

    expect(result).toMatchObject({ storeId: HOST_STORE, userId: "admin-1" });
  });

  it("uses the host store when no active-store cookie is present", async () => {
    mockAuthUser("admin-1");
    mockCookies();
    mockServiceClient({ [HOST_STORE]: true });

    const result = await authorizeActiveStoreAdmin();

    expect(result).toMatchObject({ storeId: HOST_STORE, userId: "admin-1" });
  });

  it("denies when the host store is not manageable", async () => {
    mockAuthUser("admin-1");
    mockCookies();
    mockServiceClient({ [HOST_STORE]: false });

    const result = await authorizeActiveStoreAdmin();

    expect(result).toEqual({ error: "Acceso denegado", status: 403 });
  });

  it("denies with 401 when there is no authenticated user", async () => {
    mockAuthUser(null);
    mockCookies(signActiveStore(COOKIE_STORE));
    mockServiceClient({ [COOKIE_STORE]: true });

    const result = await authorizeActiveStoreAdmin();

    expect(result).toEqual({ error: "Acceso denegado", status: 401 });
  });
});

describe("active-store cookie signing", () => {
  beforeEach(() => {
    process.env.ADMIN_COOKIE_SECRET = "test-cookie-secret";
  });

  it("round-trips a signed store id", () => {
    expect(verifyActiveStore(signActiveStore(COOKIE_STORE))).toBe(COOKIE_STORE);
  });

  it("rejects a tampered signature", () => {
    expect(verifyActiveStore(`${COOKIE_STORE}.deadbeef`)).toBeNull();
  });

  it("returns null when the secret is unset", () => {
    const signed = signActiveStore(COOKIE_STORE);
    delete process.env.ADMIN_COOKIE_SECRET;

    expect(verifyActiveStore(signed)).toBeNull();
  });

  it("throws when signing without a secret", () => {
    delete process.env.ADMIN_COOKIE_SECRET;

    expect(() => signActiveStore(COOKIE_STORE)).toThrow();
  });
});
