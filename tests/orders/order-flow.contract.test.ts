import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getOrders,
  type CreateOrderData,
} from "@/lib/supabase/orders-api";

const { getSupabaseEcommerceMock, getStoreIdMock } = vi.hoisted(() => ({
  getSupabaseEcommerceMock: vi.fn(),
  getStoreIdMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: getSupabaseEcommerceMock,
}));

vi.mock("@/lib/utils/store", () => ({
  getStoreId: getStoreIdMock,
}));

type ScriptedResponse = { data?: any; error?: any; count?: number };

class QueryBuilder {
  private mode: "select" | "insert" | "update" = "select";

  constructor(
    private readonly state: MockSupabaseState,
    private readonly table: string,
  ) {}

  select(): this {
    if (this.mode !== "insert") {
      this.mode = "select";
    }
    return this;
  }

  insert(payload: any): this {
    this.mode = "insert";
    this.state.inserts[this.table] = this.state.inserts[this.table] || [];
    this.state.inserts[this.table].push(payload);
    return this;
  }

  update(payload: any): this {
    this.mode = "update";
    this.state.updates[this.table] = this.state.updates[this.table] || [];
    this.state.updates[this.table].push(payload);
    return this;
  }

  eq(): this {
    return this;
  }

  order(): this {
    return this;
  }

  range(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  single(): Promise<ScriptedResponse> {
    return Promise.resolve(this.state.next(this.table, this.mode));
  }

  then<TResult1 = ScriptedResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: ScriptedResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.state.next(this.table, this.mode)).then(
      onfulfilled,
      onrejected,
    );
  }
}

class MockSupabaseState {
  public readonly fromCalls: string[] = [];
  public readonly inserts: Record<string, any[]> = {};
  public readonly updates: Record<string, any[]> = {};

  constructor(private readonly script: Record<string, ScriptedResponse[]>) {}

  from = (table: string) => {
    this.fromCalls.push(table);
    return new QueryBuilder(this, table);
  };

  next(table: string, mode: "select" | "insert" | "update"): ScriptedResponse {
    const key = `${table}:${mode}`;
    const queue = this.script[key];
    if (!queue || queue.length === 0) {
      if (mode === "update") {
        return { error: null };
      }
      if (mode === "insert") {
        return { data: [], error: null };
      }
      return {
        data: null,
        error: { message: `missing mock for ${key}` },
        count: 0,
      };
    }

    return queue.shift()!;
  }
}

const baseOrderData: CreateOrderData = {
  customer_type: "guest",
  customer_email: "buyer@example.com",
  customer_first_name: "Ada",
  customer_last_name: "Lovelace",
  shipping_address: "Calle 123",
  shipping_city: "Bogotá",
  shipping_postal_code: "110111",
  total_amount: 100000,
  subtotal: 100000,
  items: [
    {
      product_id: "store-item-1",
      product_name: "Campera",
      unit_price: 100000,
      quantity: 1,
      total_price: 100000,
    },
  ],
};

describe("orders-api live order contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoreIdMock.mockResolvedValue(null);
  });

  it("creates live order graph with store_id, explicit item UUIDs, and shipping address row", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: { track_inventory: false, inventory_quantity: 10 },
          error: null,
        },
        {
          data: {
            store_id: "store-uuid-1",
            track_inventory: false,
            inventory_quantity: 10,
          },
          error: null,
        },
        {
          data: { track_inventory: false, inventory_quantity: 10 },
          error: null,
        },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-1",
            order_number: "A-1001",
            payment_method: "cash_on_delivery",
            payment_status: "pending",
            payment_reference: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            ...baseOrderData,
          },
          error: null,
        },
      ],
      "order_items:insert": [
        {
          data: [
            {
              id: "generated-item-id",
              order_id: "order-1",
              product_id: "store-item-1",
              product_name: "Campera",
              quantity: 1,
              unit_price: 100000,
              total_price: 100000,
              currency_code: "COP",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-1" }], error: null }],
      "store_items:update": [{ error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const created = await createOrder(baseOrderData);

    expect(created?.id).toBe("order-1");

    const insertedOrder = state.inserts.orders?.[0];
    expect(insertedOrder.store_id).toBe("store-uuid-1");

    const insertedItems = state.inserts.order_items?.[0] as Array<
      Record<string, any>
    >;
    expect(insertedItems[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(state.inserts.order_addresses?.length).toBe(1);
    expect(state.fromCalls).not.toContain("store_items_legacy");
  });

  it("derives store_id from variant context when product_id is absent", async () => {
    const state = new MockSupabaseState({
      "item_variants:select": [
        {
          data: {
            track_inventory: false,
            inventory_quantity: 5,
            store_item_id: "store-item-2",
          },
          error: null,
        },
        { data: { store_item_id: "store-item-2" }, error: null },
      ],
      "store_items:select": [
        { data: { store_id: "store-uuid-2" }, error: null },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-2",
            order_number: "A-1002",
            payment_method: "cash_on_delivery",
            payment_status: "pending",
            payment_reference: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            ...baseOrderData,
          },
          error: null,
        },
      ],
      "order_items:insert": [{ data: [{ id: "item-2" }], error: null }],
      "order_addresses:insert": [{ data: [{ id: "addr-2" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    await createOrder({
      ...baseOrderData,
      items: [
        {
          product_name: "Campera Variante",
          variant_id: "variant-1",
          unit_price: 100000,
          quantity: 1,
          total_price: 100000,
        },
      ],
    });

    const insertedOrder = state.inserts.orders?.[0];
    expect(insertedOrder.store_id).toBe("store-uuid-2");
  });

  it("reads live orders table for id/number/admin paths with payment compatibility fallback", async () => {
    const orderRow = {
      id: "order-live-1",
      order_number: "A-2001",
      order_date: "2026-01-01T00:00:00.000Z",
      status: "pending",
      customer_type: "guest",
      customer_email: "buyer@example.com",
      customer_first_name: "Ada",
      customer_last_name: "Lovelace",
      shipping_address: "Calle 123",
      shipping_city: "Bogotá",
      shipping_postal_code: "110111",
      shipping_country: "Colombia",
      subtotal: 100000,
      shipping_cost: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 100000,
      currency_code: "COP",
      payment_method: "cash_on_delivery",
      payment_status: "pending",
      payment_reference: "manual-ref",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const state = new MockSupabaseState({
      "orders:select": [
        { data: orderRow, error: null },
        { data: orderRow, error: null },
        { data: [orderRow], error: null, count: 1 },
      ],
      "order_items:select": [
        {
          data: [
            {
              id: "item-live-1",
              order_id: "order-live-1",
              product_name: "Campera",
              quantity: 1,
              unit_price: 100000,
              total_price: 100000,
              currency_code: "COP",
            },
          ],
          error: null,
        },
        {
          data: [
            {
              id: "item-live-1",
              order_id: "order-live-1",
              product_name: "Campera",
              quantity: 1,
              unit_price: 100000,
              total_price: 100000,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:select": [
        {
          data: [
            {
              id: "addr-live-1",
              order_id: "order-live-1",
              address_type: "shipping",
              address_line_1: "Calle 123",
              city: "Bogotá",
              postal_code: "110111",
              country: "Colombia",
            },
          ],
          error: null,
        },
        {
          data: [
            {
              id: "addr-live-1",
              order_id: "order-live-1",
              address_type: "shipping",
              address_line_1: "Calle 123",
              city: "Bogotá",
              postal_code: "110111",
              country: "Colombia",
            },
          ],
          error: null,
        },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const byId = await getOrderById("order-live-1");
    const byNumber = await getOrderByNumber("A-2001");
    const adminList = await getOrders({ limit: 20 });

    expect(byId?.payment_method).toBe("cash_on_delivery");
    expect(byId?.payment_status).toBe("pending");
    expect(byId?.payment_reference).toBe("manual-ref");
    expect(byId?.items).toHaveLength(1);

    expect(byNumber?.id).toBe("order-live-1");
    expect(adminList.orders).toHaveLength(1);
    expect(adminList.total).toBe(1);

    expect(state.fromCalls).toContain("orders");
    expect(state.fromCalls).not.toContain("orders_legacy");
  });
});
