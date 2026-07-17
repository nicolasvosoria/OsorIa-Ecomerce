import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import {
  getTenantById,
  getTenantDetail,
  getTenantMetrics,
  listTenants,
} from "@/lib/supabase/stores-admin-api";

// Mirrors PostgREST: an awaited query yields the whole result, while .range()
// yields only the requested slice and .maybeSingle() yields it as-is (the
// caller configures `data` as the single row already, not an array to slice).
function makeChain(result: { data: unknown; error: unknown }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn((from: number, to: number) => ({
      then: (resolve: any, reject: any) =>
        Promise.resolve(
          result.error
            ? result
            : { data: (result.data as unknown[]).slice(from, to + 1), error: null },
        ).then(resolve, reject),
    })),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function mockService(tables: Record<string, { data: unknown; error?: unknown }>) {
  const chains = Object.fromEntries(
    Object.entries(tables).map(([table, result]) => [
      table,
      makeChain({ data: result.data, error: result.error ?? null }),
    ]),
  );

  const from = vi.fn((table: string) => {
    if (!chains[table]) {
      throw new Error(`unexpected table ${table}`);
    }
    return chains[table];
  });

  createClient.mockReturnValue({ schema: vi.fn().mockReturnValue({ from }) });

  return { chains, from };
}

describe("listTenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("lists every non-deleted store ordered by name, regardless of caller membership", async () => {
    const stores = [
      {
        id: "store-a",
        store_name: "A",
        subdomain: "a",
        is_active: true,
        is_public: true,
        created_at: "2024-01-01",
        currency_code: "COP",
      },
    ];
    const { chains } = mockService({ stores: { data: stores } });

    const tenants = await listTenants();

    expect(tenants).toEqual(stores);
    expect(chains.stores.select).toHaveBeenCalledWith(
      "id, store_name, subdomain, is_active, is_public, created_at, currency_code",
    );
    expect(chains.stores.is).toHaveBeenCalledWith("deleted_at", null);
    expect(chains.stores.order).toHaveBeenCalledWith("store_name");
  });

  it("defaults null is_active/is_public flags to false", async () => {
    const stores = [
      {
        id: "store-b",
        store_name: "B",
        subdomain: "b",
        is_active: null,
        is_public: null,
        created_at: null,
        currency_code: "COP",
      },
    ];
    mockService({ stores: { data: stores } });

    const [tenant] = await listTenants();

    expect(tenant).toMatchObject({ is_active: false, is_public: false });
  });
});

describe("getTenantMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("groups product, order and member counts per store, one query per table", async () => {
    const { from, chains } = mockService({
      store_items: {
        data: [
          { store_id: "store-a" },
          { store_id: "store-a" },
          { store_id: "store-b" },
        ],
      },
      orders: {
        data: [
          {
            store_id: "store-a",
            total_amount: "100",
            payment_status: "paid",
            created_at: "2024-01-01",
          },
          {
            store_id: "store-a",
            total_amount: "50",
            payment_status: "paid",
            created_at: "2024-01-05",
          },
        ],
      },
      store_users: {
        data: [{ store_id: "store-a" }, { store_id: "store-a" }, { store_id: "store-b" }],
      },
    });

    const metrics = await getTenantMetrics();

    expect(metrics).toEqual({
      "store-a": {
        productCount: 2,
        orderCount: 2,
        revenue: 150,
        lastOrderAt: "2024-01-05",
        memberCount: 2,
      },
      "store-b": {
        productCount: 1,
        orderCount: 0,
        revenue: 0,
        lastOrderAt: null,
        memberCount: 1,
      },
    });
    expect(from).toHaveBeenCalledTimes(3);
    expect(chains.store_items.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("sums revenue only from paid orders, but counts and dates every order", async () => {
    mockService({
      store_items: { data: [] },
      orders: {
        data: [
          {
            store_id: "store-a",
            total_amount: "100",
            payment_status: "paid",
            created_at: "2024-01-01",
          },
          {
            store_id: "store-a",
            total_amount: "200",
            payment_status: "pending",
            created_at: "2024-02-01",
          },
          {
            store_id: "store-a",
            total_amount: "300",
            payment_status: "cancelled",
            created_at: "2024-01-15",
          },
        ],
      },
      store_users: { data: [] },
    });

    const metrics = await getTenantMetrics();

    expect(metrics["store-a"]).toMatchObject({
      orderCount: 3,
      revenue: 100,
      lastOrderAt: "2024-02-01",
    });
  });

  it("leaves lastOrderAt null when a store never received an order", async () => {
    mockService({
      store_items: { data: [{ store_id: "store-a" }] },
      orders: { data: [] },
      store_users: { data: [] },
    });

    const metrics = await getTenantMetrics();

    expect(metrics["store-a"].lastOrderAt).toBeNull();
    expect(metrics["store-a"].orderCount).toBe(0);
  });

  it("counts every product past the PostgREST max-rows cap instead of truncating", async () => {
    const productCount = 2500;
    mockService({
      store_items: {
        data: Array.from({ length: productCount }, () => ({ store_id: "store-a" })),
      },
      orders: { data: [] },
      store_users: { data: [] },
    });

    const metrics = await getTenantMetrics();

    expect(metrics["store-a"].productCount).toBe(productCount);
  });

  it("sums every order past the PostgREST max-rows cap instead of truncating", async () => {
    const orderCount = 1001;
    mockService({
      store_items: { data: [] },
      orders: {
        data: Array.from({ length: orderCount }, () => ({
          store_id: "store-a",
          total_amount: "10",
          payment_status: "paid",
          created_at: "2024-01-01",
        })),
      },
      store_users: { data: [] },
    });

    const metrics = await getTenantMetrics();

    expect(metrics["store-a"]).toMatchObject({
      productCount: 0,
      orderCount,
      revenue: orderCount * 10,
    });
  });

  it("counts every member past the PostgREST max-rows cap instead of truncating", async () => {
    const memberCount = 1200;
    mockService({
      store_items: { data: [] },
      orders: { data: [] },
      store_users: {
        data: Array.from({ length: memberCount }, () => ({ store_id: "store-a" })),
      },
    });

    const metrics = await getTenantMetrics();

    expect(metrics["store-a"].memberCount).toBe(memberCount);
  });

  it("surfaces a paged scan failure instead of reporting partial metrics", async () => {
    mockService({
      store_items: { data: [], error: { message: "permission denied" } },
      orders: { data: [] },
      store_users: { data: [] },
    });

    await expect(getTenantMetrics()).rejects.toThrow(
      "No se pudieron contar los productos: permission denied",
    );
  });
});

describe("getTenantById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("finds the tenant by id among the non-deleted stores", async () => {
    const store = {
      id: "store-a",
      store_name: "A",
      subdomain: "a",
      is_active: true,
      is_public: true,
      created_at: "2024-01-01",
      currency_code: "COP",
    };
    const { chains } = mockService({ stores: { data: store } });

    const tenant = await getTenantById("store-a");

    expect(tenant).toEqual(store);
    expect(chains.stores.eq).toHaveBeenCalledWith("id", "store-a");
    expect(chains.stores.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("returns null for an id that matches no store, deleted or otherwise", async () => {
    mockService({ stores: { data: null } });

    expect(await getTenantById("missing")).toBeNull();
  });
});

// getTenantDetail composes several tables at once (orders, store_items, carts,
// store_users, app_theme_versions, app_themes, store_branding), each queried
// with different filters — the shared makeChain/mockService pair above only
// models one static result per table, so this fake router tracks the filters
// and columns each individual call applied and resolves per-call instead.
type DetailQueryResult = { data?: unknown; error?: unknown; count?: number };
type DetailTableHandler = (filters: Record<string, unknown>, columns: string) => DetailQueryResult;

function mockDetailService(handlers: Record<string, DetailTableHandler>) {
  const selectCalls: Record<string, string[]> = {};

  const from = vi.fn((table: string) => {
    const handler = handlers[table];
    if (!handler) {
      throw new Error(`unexpected table ${table}`);
    }
    return makeDetailChain(table, handler, selectCalls);
  });

  createClient.mockReturnValue({ schema: vi.fn().mockReturnValue({ from }) });

  return { from, selectCalls };
}

function makeDetailChain(
  table: string,
  handler: DetailTableHandler,
  selectCalls: Record<string, string[]>,
) {
  const filters: Record<string, unknown> = {};
  let columns = "";

  const resolve = () => Promise.resolve(handler(filters, columns));

  const chain: any = {
    select: vi.fn((requestedColumns: string) => {
      columns = requestedColumns;
      (selectCalls[table] ??= []).push(requestedColumns);
      return chain;
    }),
    eq: vi.fn((key: string, value: unknown) => {
      filters[key] = value;
      return chain;
    }),
    is: vi.fn((key: string, value: unknown) => {
      filters[key] = value;
      return chain;
    }),
    order: vi.fn(() => chain),
    range: vi.fn(() => resolve()),
    maybeSingle: vi.fn(() => resolve()),
    then: (onFulfilled: any, onRejected: any) => resolve().then(onFulfilled, onRejected),
  };
  return chain;
}

const TIENDA_A = "store-a";

function orderRow(overrides: {
  status: string;
  payment_status: string;
  created_at: string;
  total_amount?: string;
}) {
  return { total_amount: "100", ...overrides };
}

function detailHandlers(overrides: Partial<Record<string, DetailTableHandler>> = {}) {
  return {
    orders: () => ({ data: [], error: null }),
    store_items: () => ({ count: 0, error: null }),
    carts: () => ({ count: 0, error: null }),
    store_users: () => ({ count: 0, error: null }),
    app_theme_versions: () => ({ data: null, error: null }),
    app_themes: () => ({ data: null, error: null }),
    store_branding: () => ({ data: null, error: null }),
    ...overrides,
  };
}

describe("getTenantDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("buckets orders by status and by payment_status, zero-filling absent buckets", async () => {
    mockDetailService(
      detailHandlers({
        orders: () => ({
          data: [
            orderRow({ status: "pending", payment_status: "pending", created_at: "2024-01-01" }),
            orderRow({ status: "pending", payment_status: "paid", created_at: "2024-01-03" }),
            orderRow({ status: "delivered", payment_status: "paid", created_at: "2024-01-02" }),
            orderRow({
              status: "cancelled",
              payment_status: "cancelled",
              created_at: "2024-01-04",
            }),
          ],
          error: null,
        }),
      }),
    );

    const detail = await getTenantDetail(TIENDA_A);

    expect(detail.ordersByStatus).toEqual({
      pending: 2,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 1,
      returned: 0,
      cancelled: 1,
    });
    expect(detail.ordersByPaymentStatus).toEqual({
      pending: 1,
      paid: 2,
      failed: 0,
      refunded: 0,
      cancelled: 1,
    });
  });

  it("sums paid-only revenue, tracking the latest order regardless of payment status", async () => {
    mockDetailService(
      detailHandlers({
        orders: () => ({
          data: [
            orderRow({
              status: "delivered",
              payment_status: "paid",
              total_amount: "100",
              created_at: "2024-01-01",
            }),
            orderRow({
              status: "pending",
              payment_status: "pending",
              total_amount: "500",
              created_at: "2024-02-01",
            }),
          ],
          error: null,
        }),
      }),
    );

    const detail = await getTenantDetail(TIENDA_A);

    expect(detail.revenue).toBe(100);
    expect(detail.lastOrderAt).toBe("2024-02-01");
  });

  it("reports total vs active catalog counts via head-only queries", async () => {
    mockDetailService(
      detailHandlers({
        store_items: (filters) => ({
          count: filters.is_active === true ? 4 : 9,
          error: null,
        }),
      }),
    );

    const detail = await getTenantDetail(TIENDA_A);

    expect(detail.totalItemCount).toBe(9);
    expect(detail.activeItemCount).toBe(4);
  });

  it("counts carts per status independently", async () => {
    mockDetailService(
      detailHandlers({
        carts: (filters) => {
          const counts: Record<string, number> = { active: 3, abandoned: 1, expired: 2 };
          return { count: counts[filters.status as string] ?? 0, error: null };
        },
      }),
    );

    const detail = await getTenantDetail(TIENDA_A);

    expect(detail.cartsByStatus).toEqual({ active: 3, abandoned: 1, expired: 2 });
  });

  it("reads team size as a direct head count on store_users", async () => {
    mockDetailService(detailHandlers({ store_users: () => ({ count: 5, error: null }) }));

    expect((await getTenantDetail(TIENDA_A)).memberCount).toBe(5);
  });

  it("resolves the current theme's name and custom flag from the two-step lookup", async () => {
    mockDetailService(
      detailHandlers({
        app_theme_versions: () => ({ data: { theme_id: 3, is_custom: true }, error: null }),
        app_themes: () => ({ data: { theme_name: "Bold" }, error: null }),
      }),
    );

    const detail = await getTenantDetail(TIENDA_A);

    expect(detail.themeName).toBe("Bold");
    expect(detail.isThemeCustom).toBe(true);
  });

  it("leaves the theme null when the store never published a version", async () => {
    mockDetailService(detailHandlers());

    const detail = await getTenantDetail(TIENDA_A);

    expect(detail.themeName).toBeNull();
    expect(detail.isThemeCustom).toBe(false);
  });

  it("reads branding as logo_url IS NOT NULL, nothing else", async () => {
    mockDetailService(
      detailHandlers({
        store_branding: () => ({ data: { logo_url: "https://cdn/logo.png" }, error: null }),
      }),
    );

    expect((await getTenantDetail(TIENDA_A)).hasBranding).toBe(true);
  });

  it("reads no branding when store_branding has no row for the store", async () => {
    mockDetailService(detailHandlers());

    expect((await getTenantDetail(TIENDA_A)).hasBranding).toBe(false);
  });

  // D6: never customer_*, user_id, email, name, address, shipping_*, notes,
  // payment_reference or metadata — every select() call across every table
  // this function touches is checked, not just the orders table.
  it("never selects a PII column from any table it reads", async () => {
    const PII_COLUMN_PATTERN =
      /customer_|\buser_id\b|email|first_name|last_name|address|shipping_|\bnotes\b|payment_reference|metadata/i;
    const { selectCalls } = mockDetailService(detailHandlers());

    await getTenantDetail(TIENDA_A);

    const everySelectCall = Object.values(selectCalls).flat();
    expect(everySelectCall.length).toBeGreaterThan(0);
    for (const columns of everySelectCall) {
      expect(columns).not.toMatch(PII_COLUMN_PATTERN);
    }
  });
});
