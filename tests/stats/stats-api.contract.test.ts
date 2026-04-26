import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardStats, getDetailedStats } from "@/lib/supabase/stats-api";

const { getSupabaseEcommerceMock } = vi.hoisted(() => ({
  getSupabaseEcommerceMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: getSupabaseEcommerceMock,
}));

type ScriptedResponse = { data?: any; error?: any; count?: number | null };

class QueryBuilder {
  constructor(
    private readonly state: MockSupabaseState,
    private readonly table: string,
  ) {}

  select(columns?: string, options?: Record<string, unknown>): this {
    this.state.record(this.state.selects, this.table, { columns, options });
    return this;
  }

  eq(column: string, value: unknown): this {
    this.state.record(this.state.filters, this.table, { op: "eq", column, value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.state.record(this.state.filters, this.table, { op: "gte", column, value });
    return this;
  }

  in(column: string, value: unknown): this {
    this.state.record(this.state.filters, this.table, { op: "in", column, value });
    return this;
  }

  then<TResult1 = ScriptedResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: ScriptedResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.state.next(this.table)).then(
      onfulfilled,
      onrejected,
    );
  }
}

class MockSupabaseState {
  public readonly fromCalls: string[] = [];
  public readonly selects: Record<string, any[]> = {};
  public readonly filters: Record<string, any[]> = {};

  constructor(private readonly script: Record<string, ScriptedResponse[]>) {}

  from = (table: string) => {
    this.fromCalls.push(table);
    return new QueryBuilder(this, table);
  };

  record(target: Record<string, any[]>, table: string, payload: any) {
    target[table] = target[table] || [];
    target[table].push(payload);
  }

  next(table: string): ScriptedResponse {
    const queue = this.script[table];
    if (!queue || queue.length === 0) {
      return { data: null, error: null, count: 0 };
    }
    return queue.shift()!;
  }
}

describe("stats-api contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T15:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads dashboard stats from canonical ecommerce tables", async () => {
    const state = new MockSupabaseState({
      store_items: [{ count: 3, error: null }],
      orders: [
        { count: 2, error: null },
        {
          data: [{ total_amount: "100.50" }, { total_amount: 200 }],
          error: null,
        },
      ],
      user_profiles: [{ count: 4, error: null }],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const result = await getDashboardStats();

    expect(result).toEqual({
      totalProducts: 3,
      ordersToday: 2,
      totalUsers: 4,
      monthlySales: 300.5,
    });
    expect(state.fromCalls).toEqual([
      "store_items",
      "orders",
      "user_profiles",
      "orders",
    ]);
    expect(state.fromCalls).not.toContain("store_items_legacy");
    expect(state.fromCalls).not.toContain("orders_legacy");
    expect(state.filters.store_items).toEqual([
      { op: "eq", column: "is_active", value: true },
    ]);
    expect(state.filters.orders).toEqual(
      expect.arrayContaining([
        { op: "gte", column: "created_at", value: "2026-04-26T00:00:00.000Z" },
        {
          op: "in",
          column: "payment_status",
          value: ["paid"],
        },
      ]),
    );
  });

  it("loads detailed stats from orders and order_items without legacy views", async () => {
    const state = new MockSupabaseState({
      orders: [
        {
          data: [
            {
              id: "order-1",
              created_at: "2026-04-25T10:00:00.000Z",
              total_amount: "120.25",
            },
            {
              id: "order-2",
              created_at: "2026-04-26T11:00:00.000Z",
              total_amount: 79.75,
            },
          ],
          error: null,
        },
        {
          data: [
            { id: "order-1", status: "confirmed" },
            { id: "order-2", status: "delivered" },
            { id: "order-3", status: "cancelled" },
          ],
          error: null,
        },
      ],
      order_items: [
        {
          data: [
            {
              id: "line-1",
              product_id: "item-1",
              product_name: "Café",
              quantity: "2",
              unit_price: "50",
            },
            {
              id: "line-2",
              product_id: "item-1",
              product_name: "Café",
              quantity: 1,
              unit_price: 50,
            },
          ],
          error: null,
        },
      ],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const result = await getDetailedStats(2);

    expect(state.fromCalls).toEqual(["orders", "orders", "order_items"]);
    expect(state.fromCalls).not.toContain("orders_legacy");
    expect(result.salesByDay).toEqual([
      { date: "2026-04-25", sales: 120.25, orders: 1 },
      { date: "2026-04-26", sales: 79.75, orders: 1 },
    ]);
    expect(result.ordersByStatus).toEqual([
      { status: "confirmed", count: 1 },
      { status: "delivered", count: 1 },
      { status: "cancelled", count: 1 },
    ]);
    expect(result.topProducts).toEqual([
      {
        id: "item-1",
        name: "Café",
        sales: 3,
        quantity: 3,
        revenue: 150,
      },
    ]);
    expect(result.totalOrders).toBe(3);
    expect(result.averageOrderValue).toBe(100);
    expect(result.conversionRate).toBeCloseTo(66.666, 2);
  });
});
