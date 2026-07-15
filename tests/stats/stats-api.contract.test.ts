import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDetailedStats,
  getStoreDashboardSummary,
  getTopSellingProductIds,
} from "@/lib/supabase/stats-api";

const { getSupabaseEcommerceMock, getSupabaseServiceClientMock } = vi.hoisted(() => ({
  getSupabaseEcommerceMock: vi.fn(),
  getSupabaseServiceClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: getSupabaseEcommerceMock,
}));

vi.mock("@/lib/supabase/admin-store", () => ({
  getSupabaseServiceClient: getSupabaseServiceClientMock,
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

  order(column: string, options?: Record<string, unknown>): this {
    this.state.record(this.state.filters, this.table, { op: "order", column, value: options });
    return this;
  }

  limit(value: number): this {
    this.state.record(this.state.filters, this.table, { op: "limit", column: "", value });
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

  describe("getStoreDashboardSummary", () => {
    function scriptDashboard() {
      const state = new MockSupabaseState({
        orders: [
          {
            data: [
              {
                created_at: "2026-04-26T16:00:00.000Z",
                status: "confirmed",
                payment_status: "paid",
                total_amount: "100.50",
              },
              {
                created_at: "2026-04-26T14:00:00.000Z",
                status: "pending",
                payment_status: "pending",
                total_amount: 999,
              },
              {
                created_at: "2026-04-20T12:00:00.000Z",
                status: "delivered",
                payment_status: "paid",
                total_amount: 200,
              },
              {
                created_at: "2026-03-29T12:00:00.000Z",
                status: "delivered",
                payment_status: "paid",
                total_amount: 50,
              },
            ],
            error: null,
          },
          { count: 3, error: null },
          {
            data: [
              {
                id: "order-1",
                order_number: "OSO-1001",
                order_date: "2026-04-26T16:00:00.000Z",
                created_at: "2026-04-26T16:05:00.000Z",
                status: "confirmed",
                total_amount: "100.50",
                customer_first_name: "Ana",
                customer_last_name: "Ruiz",
                customer_email: "ana@example.com",
              },
              {
                id: "order-2",
                order_number: null,
                order_date: null,
                created_at: "2026-04-20T12:00:00.000Z",
                status: "delivered",
                total_amount: 200,
                customer_first_name: null,
                customer_last_name: null,
                customer_email: "guest@example.com",
              },
              {
                id: "order-3",
                order_number: "OSO-1003",
                order_date: "2026-04-19T12:00:00.000Z",
                created_at: "2026-04-19T12:00:00.000Z",
                status: "archived",
                total_amount: 10,
                customer_first_name: "Leo",
                customer_last_name: "Paz",
                customer_email: "leo@example.com",
              },
            ],
            error: null,
          },
        ],
        store_items: [
          {
            data: [
              { inventory_quantity: 2, low_stock_threshold: 5 },
              { inventory_quantity: 20, low_stock_threshold: 5 },
              { inventory_quantity: 0, low_stock_threshold: 0 },
            ],
            error: null,
          },
        ],
      });
      getSupabaseServiceClientMock.mockReturnValue({ from: state.from });
      return state;
    }

    it("scopes every query to the given store and uses canonical tables", async () => {
      const state = scriptDashboard();

      await getStoreDashboardSummary("store-1");

      expect(state.fromCalls).toEqual(["orders", "orders", "orders", "store_items"]);
      expect(state.fromCalls).not.toContain("orders_legacy");
      expect(state.fromCalls).not.toContain("store_items_legacy");
      expect(
        state.filters.orders.filter((filter) => filter.column === "store_id"),
      ).toEqual([
        { op: "eq", column: "store_id", value: "store-1" },
        { op: "eq", column: "store_id", value: "store-1" },
        { op: "eq", column: "store_id", value: "store-1" },
      ]);
      expect(state.filters.store_items).toEqual([
        { op: "eq", column: "store_id", value: "store-1" },
        { op: "eq", column: "is_active", value: true },
        { op: "eq", column: "track_inventory", value: true },
      ]);
    });

    it("reads orders once from the widest window covering the month and the trend", async () => {
      const state = scriptDashboard();

      await getStoreDashboardSummary("store-1");

      expect(state.filters.orders).toEqual(
        expect.arrayContaining([
          { op: "gte", column: "created_at", value: "2026-03-28T05:00:00.000Z" },
        ]),
      );
    });

    it("derives month sales, today's orders and the paid-order average ticket", async () => {
      scriptDashboard();

      const summary = await getStoreDashboardSummary("store-1");

      expect(summary.monthlySales).toBe(300.5);
      expect(summary.ordersToday).toBe(2);
      expect(summary.averageOrderValue).toBeCloseTo(116.833, 2);
      expect(summary.pendingOrders).toBe(3);
    });

    it("counts only tracked items at or below their low-stock threshold", async () => {
      scriptDashboard();

      const summary = await getStoreDashboardSummary("store-1");

      expect(summary.lowStockItems).toBe(2);
    });

    it("buckets paid sales into one entry per business day of the trend window", async () => {
      scriptDashboard();

      const summary = await getStoreDashboardSummary("store-1");

      expect(summary.salesByDay).toHaveLength(30);
      expect(summary.salesByDay[0]).toEqual({ date: "2026-03-28", sales: 0, orders: 0 });
      expect(summary.salesByDay.at(-1)).toEqual({
        date: "2026-04-26",
        sales: 100.5,
        orders: 1,
      });
      expect(summary.salesByDay).toEqual(
        expect.arrayContaining([
          { date: "2026-03-29", sales: 50, orders: 1 },
          { date: "2026-04-20", sales: 200, orders: 1 },
        ]),
      );
    });

    it("breaks orders down by known status in canonical status order", async () => {
      scriptDashboard();

      const summary = await getStoreDashboardSummary("store-1");

      expect(summary.ordersByStatus).toEqual([
        { status: "pending", count: 1 },
        { status: "confirmed", count: 1 },
        { status: "delivered", count: 2 },
      ]);
    });

    it("maps recent orders to serializable rows and drops unknown statuses", async () => {
      scriptDashboard();

      const summary = await getStoreDashboardSummary("store-1");

      expect(summary.recentOrders).toEqual([
        {
          id: "order-1",
          orderNumber: "OSO-1001",
          customerName: "Ana Ruiz",
          total: 100.5,
          status: "confirmed",
          createdAt: "2026-04-26T16:00:00.000Z",
        },
        {
          id: "order-2",
          orderNumber: "order-2",
          customerName: "guest@example.com",
          total: 200,
          status: "delivered",
          createdAt: "2026-04-20T12:00:00.000Z",
        },
      ]);
    });

    it("throws instead of returning zeros when a query resolves with an error", async () => {
      const state = new MockSupabaseState({
        orders: [
          { data: [], error: null },
          { data: null, error: { message: 'relation "orders" does not exist' }, count: null },
          { data: [], error: null },
        ],
        store_items: [{ data: [], error: null }],
      });
      getSupabaseServiceClientMock.mockReturnValue({ from: state.from });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(getStoreDashboardSummary("store-1")).rejects.toThrow(
        /pedidos pendientes/,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Stats] Error al obtener el resumen del panel:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("returns an empty summary when Supabase is not configured", async () => {
      getSupabaseServiceClientMock.mockReturnValue(null);

      const summary = await getStoreDashboardSummary("store-1");

      expect(summary).toEqual({
        monthlySales: 0,
        ordersToday: 0,
        averageOrderValue: 0,
        lowStockItems: 0,
        pendingOrders: 0,
        salesByDay: [],
        ordersByStatus: [],
        recentOrders: [],
      });
    });
  });

  describe("getDetailedStats", () => {
    function scriptDetailed() {
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
      getSupabaseServiceClientMock.mockReturnValue({ from: state.from });
      return state;
    }

    it("loads detailed stats from orders and order_items without legacy views", async () => {
      const state = scriptDetailed();

      const result = await getDetailedStats("store-b", 2);

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

    it("scopes every query to the given store", async () => {
      const state = scriptDetailed();

      await getDetailedStats("store-b", 2);

      expect(
        state.filters.orders.filter((filter) => filter.column === "store_id"),
      ).toEqual([
        { op: "eq", column: "store_id", value: "store-b" },
        { op: "eq", column: "store_id", value: "store-b" },
      ]);
      expect(state.filters.order_items).toEqual(
        expect.arrayContaining([
          { op: "eq", column: "orders.store_id", value: "store-b" },
        ]),
      );
    });

    it("reads through the service client instead of the browser client", async () => {
      scriptDetailed();

      await getDetailedStats("store-b", 2);

      expect(getSupabaseServiceClientMock).toHaveBeenCalled();
      expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    });

    it("counts only sold and paid orders as sales", async () => {
      const state = scriptDetailed();

      await getDetailedStats("store-b", 2);

      expect(state.filters.orders).toEqual(
        expect.arrayContaining([
          {
            op: "in",
            column: "status",
            value: ["confirmed", "processing", "shipped", "delivered"],
          },
          { op: "in", column: "payment_status", value: ["paid"] },
        ]),
      );
    });

    it("returns empty stats when Supabase is not configured", async () => {
      getSupabaseServiceClientMock.mockReturnValue(null);

      const result = await getDetailedStats("store-b", 2);

      expect(result).toEqual({
        salesByDay: [],
        ordersByStatus: [],
        topProducts: [],
        totalOrders: 0,
        averageOrderValue: 0,
        conversionRate: 0,
      });
    });
  });

  it("ranks top-selling product ids by summed quantity, filtering by paid/confirmed orders and store", async () => {
    const state = new MockSupabaseState({
      order_items: [
        {
          data: [
            { product_id: "item-1", quantity: "2" },
            { product_id: "item-2", quantity: 5 },
            { product_id: "item-1", quantity: 1 },
            { product_id: null, quantity: 9 },
          ],
          error: null,
        },
      ],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const topIds = await getTopSellingProductIds("store-1", 2);

    expect(topIds).toEqual(["item-2", "item-1"]);
    expect(state.fromCalls).toEqual(["order_items"]);
    expect(state.filters.order_items).toEqual(
      expect.arrayContaining([
        { op: "in", column: "orders.status", value: ["confirmed", "processing", "shipped", "delivered"] },
        { op: "in", column: "orders.payment_status", value: ["paid"] },
        { op: "eq", column: "orders.store_id", value: "store-1" },
      ]),
    );
  });

  it("skips the store filter when no store id is provided", async () => {
    const state = new MockSupabaseState({
      order_items: [{ data: [{ product_id: "item-1", quantity: 3 }], error: null }],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const topIds = await getTopSellingProductIds(null, 5);

    expect(topIds).toEqual(["item-1"]);
    expect(state.filters.order_items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ column: "orders.store_id" })]),
    );
  });

  it("returns an empty list when the query fails", async () => {
    const state = new MockSupabaseState({
      order_items: [{ data: null, error: { message: "boom" } }],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const topIds = await getTopSellingProductIds("store-1", 5);

    expect(topIds).toEqual([]);
  });
});
