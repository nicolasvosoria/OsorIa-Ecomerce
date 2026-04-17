import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getOrders,
  getOrdersByEmail,
  type CreateOrderData,
} from "@/lib/supabase/orders-api";
import { loadSuccessPageFallbackOrder } from "@/app/checkout/success/fallback-order";

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

  it("decrements product and variant inventory on writable base tables", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: {
            track_inventory: true,
            inventory_quantity: 5,
            is_available_for_sale: true,
            is_active: true,
          },
          error: null,
        },
        {
          data: {
            store_id: "store-uuid-1",
            track_inventory: true,
            inventory_quantity: 5,
          },
          error: null,
        },
        {
          data: {
            track_inventory: true,
            inventory_quantity: 5,
            is_available_for_sale: true,
            is_active: true,
          },
          error: null,
        },
      ],
      "item_variants:select": [
        {
          data: {
            track_inventory: true,
            inventory_quantity: 8,
            is_available: true,
          },
          error: null,
        },
        {
          data: {
            track_inventory: true,
            inventory_quantity: 8,
            is_available: true,
          },
          error: null,
        },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-inventory-1",
            order_number: "A-1003",
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
              id: "item-inventory-1",
              order_id: "order-inventory-1",
              product_id: "store-item-1",
              product_name: "Campera",
              quantity: 2,
              unit_price: 100000,
              total_price: 200000,
              currency_code: "COP",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "item-inventory-2",
              order_id: "order-inventory-1",
              variant_id: "variant-1",
              product_name: "Campera Variante",
              quantity: 3,
              unit_price: 90000,
              total_price: 270000,
              currency_code: "COP",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-3" }], error: null }],
      "store_items:update": [{ error: null }],
      "item_variants:update": [{ error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    await createOrder({
      ...baseOrderData,
      items: [
        {
          product_id: "store-item-1",
          product_name: "Campera",
          unit_price: 100000,
          quantity: 2,
          total_price: 200000,
        },
        {
          product_name: "Campera Variante",
          variant_id: "variant-1",
          unit_price: 90000,
          quantity: 3,
          total_price: 270000,
        },
      ],
      subtotal: 470000,
      total_amount: 470000,
    });

    expect(state.updates.store_items?.[0].inventory_quantity).toBe(3);
    expect(state.updates.item_variants?.[0].inventory_quantity).toBe(5);
    expect(state.fromCalls).not.toContain("store_items_legacy");
  });

  it("persists provider payment transaction payload when present on checkout metadata", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: {
            track_inventory: false,
            inventory_quantity: 10,
            is_available_for_sale: true,
            is_active: true,
          },
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
          data: {
            track_inventory: false,
            inventory_quantity: 10,
            is_available_for_sale: true,
            is_active: true,
          },
          error: null,
        },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-provider-insert-1",
            order_number: "A-1004",
            payment_method: null,
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
        { data: [{ id: "item-provider-1" }], error: null },
      ],
      "order_addresses:insert": [
        { data: [{ id: "addr-provider-1" }], error: null },
      ],
      "store_items:update": [{ error: null }],
      "payment_transactions:insert": [{ data: [{ id: "txn-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    await createOrder({
      ...baseOrderData,
      payment_method: undefined,
      payment_reference: undefined,
      metadata: {
        provider_payload: {
          provider: "mercado_pago",
          status: "approved",
          provider_payment_method: "credit_card",
          provider_transaction_id: "mp_tx_checkout_1",
          amount: 100000,
          currency_code: "COP",
        },
      },
    });

    const insertedTransaction = state.inserts.payment_transactions?.[0];
    expect(insertedTransaction.order_id).toBe("order-provider-insert-1");
    expect(insertedTransaction.provider).toBe("mercado_pago");
    expect(insertedTransaction.status).toBe("approved");
    expect(insertedTransaction.provider_payment_method).toBe("credit_card");
    expect(insertedTransaction.provider_transaction_id).toBe(
      "mp_tx_checkout_1",
    );
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

  it("returns admin and email orders with aligned hydrated live graph fields", async () => {
    const orderRow = {
      id: "order-aligned-1",
      order_number: "A-7001",
      order_date: "2026-01-01T00:00:00.000Z",
      status: "pending",
      customer_type: "guest",
      customer_email: "aligned@example.com",
      customer_first_name: "Dana",
      customer_last_name: "Scully",
      shipping_address: "Calle Alineada 77",
      shipping_city: "Bogotá",
      shipping_postal_code: "110111",
      shipping_country: "Colombia",
      subtotal: 150000,
      shipping_cost: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 150000,
      currency_code: "COP",
      payment_method: "cash_on_delivery",
      payment_status: "pending",
      payment_reference: "cod-7001",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const expectedItems = [
      {
        id: "item-aligned-1",
        order_id: "order-aligned-1",
        product_name: "Campera Alineada",
        quantity: 2,
        unit_price: 75000,
        total_price: 150000,
        currency_code: "COP",
      },
    ];

    const expectedAddresses = [
      {
        id: "addr-aligned-1",
        order_id: "order-aligned-1",
        address_type: "shipping",
        address_line_1: "Calle Alineada 77",
        city: "Bogotá",
        postal_code: "110111",
        country: "Colombia",
      },
    ];

    const state = new MockSupabaseState({
      "orders:select": [
        { data: [orderRow], error: null, count: 1 },
        { data: [orderRow], error: null },
      ],
      "order_items:select": [
        { data: expectedItems, error: null },
        { data: expectedItems, error: null },
      ],
      "order_addresses:select": [
        { data: expectedAddresses, error: null },
        { data: expectedAddresses, error: null },
      ],
      "payment_transactions:select": [
        { data: [], error: null },
        { data: [], error: null },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const adminList = await getOrders({ limit: 20 });
    const emailOrders = await getOrdersByEmail("aligned@example.com");

    expect(adminList.orders).toHaveLength(1);
    expect(adminList.total).toBe(1);
    expect(emailOrders).toHaveLength(1);

    const adminOrder = adminList.orders[0] as any;
    expect(adminOrder.items).toEqual(expectedItems);
    expect(adminOrder.addresses).toEqual(expectedAddresses);
    expect(adminOrder.payment_method).toBe("cash_on_delivery");
    expect(adminOrder.payment_status).toBe("pending");
    expect(adminOrder.payment_reference).toBe("cod-7001");

    expect(emailOrders[0].items).toEqual(expectedItems);
    expect(emailOrders[0].addresses).toEqual(expectedAddresses);
    expect(emailOrders[0].payment_method).toBe(adminOrder.payment_method);
    expect(emailOrders[0].payment_status).toBe(adminOrder.payment_status);
    expect(emailOrders[0].payment_reference).toBe(adminOrder.payment_reference);

    expect(state.fromCalls).toContain("orders");
    expect(state.fromCalls).toContain("order_items");
    expect(state.fromCalls).toContain("order_addresses");
    expect(state.fromCalls).not.toContain("orders_legacy");
  });

  it("hydrates success-page fallback from server order lookup when local state is missing", async () => {
    const orderRow = {
      id: "order-success-1",
      order_number: "A-3001",
      order_date: "2026-01-01T00:00:00.000Z",
      status: "pending",
      customer_type: "guest",
      customer_email: "fallback@example.com",
      customer_first_name: "Grace",
      customer_last_name: "Hopper",
      customer_phone: "+57 300 123 4567",
      shipping_address: "Calle Fallback 10",
      shipping_city: "Medellín",
      shipping_postal_code: "050001",
      shipping_country: "Colombia",
      shipping_notes: "Torre B",
      subtotal: 50000,
      shipping_cost: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 50000,
      currency_code: "COP",
      payment_method: null,
      payment_status: null,
      payment_reference: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const state = new MockSupabaseState({
      "orders:select": [{ data: orderRow, error: null }],
      "order_items:select": [{ data: [], error: null }],
      "order_addresses:select": [{ data: [], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const fallback = await loadSuccessPageFallbackOrder("A-3001");

    expect(fallback.orderNumber).toBe("A-3001");
    expect(fallback.customerData?.firstName).toBe("Grace");
    expect(fallback.customerData?.lastName).toBe("Hopper");
    expect(fallback.customerData?.email).toBe("fallback@example.com");
    expect(fallback.customerData?.address).toBe("Calle Fallback 10");
  });

  it("keeps payment fields non-misleading when provider transaction payload exists", async () => {
    const orderRow = {
      id: "order-provider-1",
      order_number: "A-4001",
      order_date: "2026-01-01T00:00:00.000Z",
      status: "pending",
      customer_type: "guest",
      customer_email: "provider@example.com",
      customer_first_name: "Ada",
      customer_last_name: "Lovelace",
      shipping_address: "Calle 1",
      shipping_city: "Bogotá",
      shipping_postal_code: "110111",
      shipping_country: "Colombia",
      subtotal: 100000,
      shipping_cost: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 100000,
      currency_code: "COP",
      payment_method: null,
      payment_status: null,
      payment_reference: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const state = new MockSupabaseState({
      "orders:select": [{ data: orderRow, error: null }],
      "payment_transactions:select": [
        {
          data: [
            {
              provider: "mercado_pago",
              transaction_type: "payment",
              amount: 100000,
              currency_code: "COP",
              status: "approved",
              provider_payment_method: "credit_card",
              provider_transaction_id: "mp_tx_123",
              created_at: "2026-01-01T00:00:01.000Z",
            },
          ],
          error: null,
        },
      ],
      "order_items:select": [{ data: [], error: null }],
      "order_addresses:select": [{ data: [], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const order = await getOrderById("order-provider-1");

    expect(order?.payment_method).toBe("credit_card");
    expect(order?.payment_status).toBe("paid");
    expect(order?.payment_reference).toBe("mp_tx_123");
  });

  it("hydrates email-order retrieval with same live payment compatibility source", async () => {
    const orderRow = {
      id: "order-email-1",
      order_number: "A-5001",
      order_date: "2026-01-01T00:00:00.000Z",
      status: "pending",
      customer_type: "guest",
      customer_email: "email@example.com",
      customer_first_name: "Linus",
      customer_last_name: "Torvalds",
      shipping_address: "Calle 99",
      shipping_city: "Cali",
      shipping_postal_code: "760001",
      shipping_country: "Colombia",
      subtotal: 200000,
      shipping_cost: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 200000,
      currency_code: "COP",
      payment_method: "cash_on_delivery",
      payment_status: "pending",
      payment_reference: "cod-5001",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const state = new MockSupabaseState({
      "orders:select": [{ data: [orderRow], error: null }],
      "order_items:select": [{ data: [], error: null }],
      "order_addresses:select": [{ data: [], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const orders = await getOrdersByEmail("email@example.com");

    expect(orders).toHaveLength(1);
    expect(orders[0].payment_method).toBe("cash_on_delivery");
    expect(orders[0].payment_status).toBe("pending");
    expect(state.fromCalls).toContain("orders");
  });
});
