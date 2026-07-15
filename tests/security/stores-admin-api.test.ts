import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { getTenantMetrics, listTenants } from "@/lib/supabase/stores-admin-api";

// Mirrors PostgREST: an awaited query yields the whole result, while .range()
// yields only the requested slice.
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
      },
    ];
    const { chains } = mockService({ stores: { data: stores } });

    const tenants = await listTenants();

    expect(tenants).toEqual(stores);
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

  it("groups product and order counts per store with one query per table, not per store", async () => {
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
          { store_id: "store-a", total_amount: "100" },
          { store_id: "store-a", total_amount: "50" },
        ],
      },
    });

    const metrics = await getTenantMetrics();

    expect(metrics).toEqual({
      "store-a": { productCount: 2, orderCount: 2, revenue: 150 },
      "store-b": { productCount: 1, orderCount: 0, revenue: 0 },
    });
    expect(from).toHaveBeenCalledTimes(2);
    expect(chains.store_items.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("counts every product past the PostgREST max-rows cap instead of truncating", async () => {
    const productCount = 2500;
    mockService({
      store_items: {
        data: Array.from({ length: productCount }, () => ({ store_id: "store-a" })),
      },
      orders: { data: [] },
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
        })),
      },
    });

    const metrics = await getTenantMetrics();

    expect(metrics["store-a"]).toEqual({
      productCount: 0,
      orderCount,
      revenue: orderCount * 10,
    });
  });

  it("surfaces a paged scan failure instead of reporting partial metrics", async () => {
    mockService({
      store_items: { data: [], error: { message: "permission denied" } },
      orders: { data: [] },
    });

    await expect(getTenantMetrics()).rejects.toThrow(
      "No se pudieron contar los productos: permission denied",
    );
  });
});
