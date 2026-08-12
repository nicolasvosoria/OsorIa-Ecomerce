import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getOrders,
  getOrdersByEmail,
  type CreateOrderData,
} from "@/lib/supabase/orders-api";
import { loadSuccessPageFallbackOrder } from "@/app/checkout/success/fallback-order";
import { placeCheckoutOrder } from "@/app/checkout/actions";
import { CheckoutIdempotencyConflictError, StoreIdentityNotReadyError } from "@/lib/checkout/order-writer";
import { enabledPaymentMethodIds } from "@/lib/checkout/payment-methods";
import { checkoutOrderSchema, type CheckoutOrderInput } from "@/lib/checkout/schemas";

const {
  getSupabaseEcommerceMock,
  getStoreIdMock,
  getServiceEcommerceClientMock,
  getUserMock,
} = vi.hoisted(() => ({
  getSupabaseEcommerceMock: vi.fn(),
  getStoreIdMock: vi.fn(),
  getServiceEcommerceClientMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: getSupabaseEcommerceMock,
}));

vi.mock("@/lib/utils/store", () => ({
  getStoreId: getStoreIdMock,
}));

vi.mock("@/lib/supabase/service-client", () => ({
  getServiceEcommerceClient: getServiceEcommerceClientMock,
}));

// La action resuelve la identidad desde la sesión por cookies (getSupabaseAuthClient).
vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost" }),
}));

type ScriptedResponse = { data?: any; error?: any; count?: number };

// D27's atomic write loads the store's identity (stores/store_branding/store_contact)
// and reserves an order_number BEFORE calling ecommerce.create_order_with_notifications
// (lib/checkout/order-writer.ts) -- every test that reaches that write path now
// makes these calls too, whether or not it cares about their content. Falling
// back to a complete, valid identity when a test doesn't script one keeps every
// pre-existing test's own "stores:select" (used by resolveOrderStoreId's
// fallback in a couple of them) working unchanged: that fallback's entry is
// always consumed first, and this default only ever answers the LATER,
// identity-load call once the test's own queue is exhausted.
//
// A10: createOrder also now resolves the frozen destination from
// co_locations by shipping_location_id (resolveAuthoritativeShippingDestination),
// on every order, unconditionally -- this default matches baseOrderData/
// baseCheckoutInput's own shipping_location_id ("1") and destination fields
// exactly, so every pre-existing test that never overrides the destination
// keeps asserting the same values it always did. Tests that DO override the
// destination (proving the catalog wins over a disagreeing client payload)
// script their own "co_locations:select" entry instead.
// S9: createOrder now also resolves shipping (lib/shipping/resolver.ts),
// unconditionally, on every order -- loadShippingSettings reads this table
// first. A missing row (this default) is the "never customized" shape D11/
// D17 already gave store_shipping_settings, so every pre-existing test that
// never scripts its own settings resolves the born default: mode=coordinate,
// unmatched_destination_action=block -- status "agreed", amount 0, no zone
// tables ever queried. Tests exercising own_rates/out_of_zone script their
// own "store_shipping_settings:select" entry instead.
const DEFAULT_IDENTITY_QUEUE_RESPONSES: Record<string, ScriptedResponse> = {
  "stores:select": {
    data: { store_name: "Tienda de prueba", subdomain: "tienda-de-prueba", legal_name: null },
    error: null,
  },
  "store_branding:select": { data: null, error: null },
  "store_shipping_settings:select": { data: null, error: null },
  "co_locations:select": {
    data: {
      department_code: "11",
      department_name: "Bogotá, D.C.",
      municipality_code: "11001",
      municipality_name: "Bogotá",
    },
    error: null,
  },
  "store_contact:select": {
    data: {
      contact_email: "tienda@example.com",
      contact_phone: null,
      address: null,
      reply_to_email: null,
      reply_to_pending_email: null,
      reply_to_verified_at: null,
      order_mailbox_email: "pedidos@example.com",
      order_mailbox_pending_email: null,
      order_mailbox_verified_at: null,
    },
    error: null,
  },
};

class QueryBuilder {
  private mode: "select" | "insert" | "update" | "delete" = "select";

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

  // D41: the three checkout follow-ups this fix made idempotent per order
  // (combo snapshot, address, payment transaction) now call .upsert(...,
  // {onConflict, ignoreDuplicates: true}) instead of .insert(...). This mock
  // doesn't enforce real conflict semantics (that's proven against real
  // Postgres in supabase/checks/verify-email-platform-contract.sql) -- it
  // just routes onto the SAME "<table>:insert" queue/bookkeeping .insert()
  // already used, so every pre-existing scripted response and assertion on
  // state.inserts keeps working unchanged, and records the options passed so
  // a test can assert the right natural key was used.
  upsert(payload: any, options?: any): this {
    this.mode = "insert";
    this.state.inserts[this.table] = this.state.inserts[this.table] || [];
    this.state.inserts[this.table].push(payload);
    this.state.upsertOptions[this.table] = this.state.upsertOptions[this.table] || [];
    this.state.upsertOptions[this.table].push(options);
    return this;
  }

  update(payload: any): this {
    this.mode = "update";
    this.state.updates[this.table] = this.state.updates[this.table] || [];
    this.state.updates[this.table].push(payload);
    return this;
  }

  delete(): this {
    this.mode = "delete";
    return this;
  }

  eq(column?: string, value?: any): this {
    if (this.mode === "delete") {
      this.state.deletes[this.table] = this.state.deletes[this.table] || [];
      this.state.deletes[this.table].push({ column, value });
    }
    return this;
  }

  in(): this {
    return this;
  }

  maybeSingle(): Promise<ScriptedResponse> {
    return Promise.resolve(this.state.next(this.table, this.mode));
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
  public readonly upsertOptions: Record<string, any[]> = {};
  public readonly updates: Record<string, any[]> = {};
  public readonly deletes: Record<string, Array<{ column?: string; value?: any }>> = {};
  public readonly rpcCalls: Array<{ fn: string; params: any }> = [];

  constructor(private readonly script: Record<string, ScriptedResponse[]>) {}

  from = (table: string) => {
    this.fromCalls.push(table);
    return new QueryBuilder(this, table);
  };

  // Mock de supabase.rpc(...). Por defecto responde "sin faltantes" (data: [])
  // para no romper los flujos felices existentes de ecommerce.decrement_inventory;
  // los tests que necesiten otro resultado lo scriptean bajo la clave
  // `rpc:<nombre_funcion>`. generate_order_number y create_order_with_notifications
  // (D27/D28) tienen su propio comportamiento por defecto abajo, reusado por
  // TODOS los tests que ejercitan el camino de escritura sin tener que
  // scriptearlos uno por uno.
  rpc = (fn: string, params: any): Promise<ScriptedResponse> => {
    this.rpcCalls.push({ fn, params });
    const queue = this.script[`rpc:${fn}`];

    if (queue && queue.length > 0) {
      return Promise.resolve(queue.shift()!);
    }

    if (fn === "generate_order_number") {
      return Promise.resolve({ data: "A-AUTO-000000", error: null });
    }

    if (fn === "create_order_with_notifications") {
      return Promise.resolve(this.bridgeCreateOrderWithNotifications(params));
    }

    return Promise.resolve({ data: [], error: null });
  };

  // D27 replaced the two separate orders/order_items insert() calls with one
  // RPC. Bridging that RPC call back onto the SAME "orders:insert" /
  // "order_items:insert" queues and inserts bookkeeping this file already used
  // keeps every pre-existing test's scripted responses and assertions working
  // unchanged; only tests that care about idempotency/notifications/rollback
  // script `rpc:create_order_with_notifications` directly instead.
  private bridgeCreateOrderWithNotifications(rawParams: any): ScriptedResponse {
    // The real supabase-js client JSON-serializes RPC params over HTTP, which
    // drops any undefined-valued key (e.g. payment_reference: undefined) --
    // Postgres then reads it back as NULL via ->>'...'. This mock receives the
    // raw JS object with no such transport step, so it round-trips through
    // JSON itself to match that same fidelity.
    const params = JSON.parse(JSON.stringify(rawParams));
    const orderPayload = { store_id: params.p_store_id, ...params.p_order };
    this.inserts.orders = this.inserts.orders || [];
    this.inserts.orders.push(orderPayload);
    const orderResponse = this.next("orders", "insert");
    if (orderResponse.error) {
      return { data: null, error: orderResponse.error };
    }

    const itemsPayload = (params.p_items || []).map((item: any) => ({ ...item }));
    this.inserts.order_items = this.inserts.order_items || [];
    this.inserts.order_items.push(itemsPayload);
    const itemsResponse = this.next("order_items", "insert");

    this.inserts.email_outbox = this.inserts.email_outbox || [];
    this.inserts.email_outbox.push(params.p_notifications || []);

    return {
      data: { ok: true, replayed: false, order: orderResponse.data, items: itemsResponse.data ?? [] },
      error: null,
    };
  }

  next(
    table: string,
    mode: "select" | "insert" | "update" | "delete",
  ): ScriptedResponse {
    const key = `${table}:${mode}`;
    const queue = this.script[key];
    if (!queue || queue.length === 0) {
      if (mode === "select" && DEFAULT_IDENTITY_QUEUE_RESPONSES[key]) {
        return DEFAULT_IDENTITY_QUEUE_RESPONSES[key];
      }
      if (mode === "update" || mode === "delete") {
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

// D2/D30: shipping_location_id/shipping_department_code/shipping_department_name/
// shipping_municipality_code are the checkout's destination picker (D28) output --
// required on every order now, so every fixture below carries them once here and
// every call site that spreads ...baseOrderData/...baseCheckoutInput inherits them.
const baseOrderData: CreateOrderData = {
  idempotency_key: "test-idempotency-key",
  payload_fingerprint: "test-payload-fingerprint",
  customer_type: "guest",
  customer_email: "buyer@example.com",
  customer_first_name: "Ada",
  customer_last_name: "Lovelace",
  shipping_address: "Calle 123",
  shipping_department_code: "11",
  shipping_department_name: "Bogotá, D.C.",
  shipping_city: "Bogotá",
  shipping_municipality_code: "11001",
  shipping_location_id: "1",
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

// Payload como el que arma el checkout: solo datos del cliente, sin los campos
// que la action fuerza (customer_type, user_id, payment_status, totales).
const baseCheckoutInput: CheckoutOrderInput = {
  customer_email: "buyer@example.com",
  customer_first_name: "Ada",
  customer_last_name: "Lovelace",
  shipping_address: "Calle 123",
  shipping_department_code: "11",
  shipping_department_name: "Bogotá, D.C.",
  shipping_city: "Bogotá",
  shipping_municipality_code: "11001",
  shipping_location_id: "1",
  shipping_postal_code: "110111",
  payment_method: "cash_on_delivery",
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
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates live order graph with store_id, explicit item UUIDs, and shipping address row", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-1", base_price: 100000, currency_code: "COP" },
          ],
          error: null,
        },
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
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const created = await createOrder(baseOrderData);

    expect(created?.id).toBe("order-1");

    const insertedOrder = state.inserts.orders?.[0];
    expect(insertedOrder.store_id).toBe("store-uuid-1");

    const insertedItems = state.inserts.order_items?.[0] as Array<
      Record<string, any>
    >;
    // D27: item ids are now assigned by ecommerce.order_items' own
    // gen_random_uuid() default inside the atomic RPC, not generated in app
    // code -- the payload the RPC receives carries no id at all.
    expect(insertedItems[0].id).toBeUndefined();
    expect(insertedItems[0].product_id).toBe("store-item-1");

    expect(state.inserts.order_addresses?.length).toBe(1);
    expect(state.inserts.order_addresses?.[0]).toMatchObject({
      order_id: "order-1",
      address_type: "shipping",
      address_line_1: "Calle 123",
      city: "Bogotá",
      postal_code: "110111",
      country: "Colombia",
    });
    expect(state.fromCalls).not.toContain("store_items_legacy");
  });

  it("derives store_id from variant context when product_id is absent", async () => {
    const state = new MockSupabaseState({
      "item_variants:select": [
        {
          data: [
            { id: "variant-1", price: 100000, item_id: "store-item-2" },
          ],
          error: null,
        },
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
        {
          data: [
            { id: "store-item-2", base_price: 100000, currency_code: "COP" },
          ],
          error: null,
        },
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

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

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

  it("recalculates combo order snapshot and deducts every tracked component", async () => {
    const state = new MockSupabaseState({
      "product_combos:select": [
        {
          data: [
            {
              id: "combo-1",
              name: "Combo Café",
              slug: "combo-cafe",
              description: "Café + mug",
              image_url: "/combo.jpg",
              is_active: true,
              discount_type: "percentage",
              discount_value: 10,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "product_combo_components:select": [
        {
          data: [
            {
              combo_id: "combo-1",
              product_id: "store-item-1",
              variant_id: null,
              quantity: 2,
            },
            {
              combo_id: "combo-1",
              product_id: "store-item-2",
              variant_id: "variant-2",
              quantity: 1,
            },
          ],
          error: null,
        },
      ],
      "store_items:select": [
        {
          data: [
            {
              id: "store-item-1",
              store_id: "store-uuid-1",
              item_name: "Café 250g",
              base_price: 30000,
              currency_code: "COP",
              track_inventory: true,
              inventory_quantity: 10,
              is_active: true,
              is_available_for_sale: true,
            },
            {
              id: "store-item-2",
              store_id: "store-uuid-1",
              item_name: "Mug",
              base_price: 20000,
              currency_code: "COP",
              track_inventory: false,
              inventory_quantity: 0,
              is_active: true,
              is_available_for_sale: true,
            },
          ],
          error: null,
        },
        { data: { track_inventory: true, inventory_quantity: 10 }, error: null },
      ],
      "stores:select": [{ data: [{ id: "store-uuid-1" }], error: null }],
      "item_variants:select": [
        {
          data: [
            {
              id: "variant-2",
              item_id: "store-item-2",
              variant_code: "Blanco",
              price: 20000,
              track_inventory: true,
              inventory_quantity: 4,
              is_available: true,
            },
          ],
          error: null,
        },
        { data: { track_inventory: true, inventory_quantity: 4 }, error: null },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-combo-1",
            order_number: "A-COMBO",
            payment_method: "cash_on_delivery",
            payment_status: "pending",
            payment_reference: null,
            created_at: "2026-05-04T00:00:00.000Z",
            updated_at: "2026-05-04T00:00:00.000Z",
            ...baseOrderData,
          },
          error: null,
        },
      ],
      "order_items:insert": [
        {
          data: [
            {
              id: "combo-order-item-1",
              order_id: "order-combo-1",
              product_id: null,
              product_name: "Combo Café",
              quantity: 2,
              unit_price: 72000,
              total_price: 144000,
              currency_code: "COP",
              metadata: {
                item_kind: "combo",
                combo_id: "combo-1",
                combo_snapshot: {
                  id: "combo-1",
                  name: "Combo Café",
                  orderedQuantity: 2,
                  chargedUnitPrice: 72000,
                  chargedLineTotal: 144000,
                  pricing: {
                    componentSubtotal: 80000,
                    discountType: "percentage",
                    discountValue: 10,
                    discountAmount: 8000,
                    finalUnitPrice: 72000,
                    currencyCode: "COP",
                    components: [
                      {
                        productId: "store-item-1",
                        productName: "Café 250g",
                        unitPrice: 30000,
                        quantity: 2,
                        lineSubtotal: 60000,
                      },
                      {
                        productId: "store-item-2",
                        productName: "Mug",
                        variantId: "variant-2",
                        unitPrice: 20000,
                        quantity: 1,
                        lineSubtotal: 20000,
                      },
                    ],
                  },
                  availability: { isAvailable: true, derivedStock: 4, blockingComponents: [] },
                  components: [
                    { productId: "store-item-1", productName: "Café 250g", quantity: 2 },
                    { productId: "store-item-2", productName: "Mug", variantId: "variant-2", quantity: 1 },
                  ],
                },
              },
            },
          ],
          error: null,
        },
      ],
      "order_combo_snapshots:insert": [{ data: [{ id: "snapshot-1" }], error: null }],
      "order_addresses:insert": [{ data: [{ id: "addr-combo" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const created = await createOrder({
      ...baseOrderData,
      subtotal: 0,
      total_amount: 0,
      items: [
        {
          product_name: "Combo Café",
          unit_price: 0,
          quantity: 2,
          total_price: 0,
          metadata: {
            item_kind: "combo",
            combo_id: "combo-1",
          },
        },
      ],
    });

    expect(created?.items[0].unit_price).toBe(72000);
    expect(state.inserts.orders?.[0]).toMatchObject({
      subtotal: 144000,
      total_amount: 144000,
    });
    expect(state.inserts.order_combo_snapshots?.[0][0]).toMatchObject({
      order_id: "order-combo-1",
      order_item_id: "combo-order-item-1",
      combo_id: "combo-1",
      component_subtotal: 80000,
      discount_amount: 8000,
      charged_unit_price: 72000,
      charged_line_total: 144000,
    });
    // El descuento ya no es un update() directo: es una única llamada
    // atómica a la RPC ecommerce.decrement_inventory con los componentes del
    // combo ya expandidos (café 2x2=4, mug variante 1x2=2).
    const decrementCall = state.rpcCalls.find((call) => call.fn === "decrement_inventory");
    expect(decrementCall?.params).toMatchObject({
      p_order_id: "order-combo-1",
      p_store_id: "store-uuid-1",
    });
    expect(decrementCall?.params.p_items).toEqual([
      { variant_id: null, product_id: "store-item-1", quantity: 4 },
      { variant_id: "variant-2", product_id: "store-item-2", quantity: 2 },
    ]);
  });

  it("resolves store_id from combo components for a solo-combo cart (no stores fallback mocked)", async () => {
    // Carrito SOLO-COMBO: el único item es un combo, así que product_id y
    // variant_id de nivel superior llegan en null (prepareComboOrderItems los
    // limpia). No se scriptea "stores:select" a propósito: si
    // resolveOrderStoreId no resolviera el store_id desde los componentes del
    // combo, el único camino restante sería el fallback de tienda activa, que
    // aquí fallaría por falta de mock (simulando que no hay contexto de
    // tienda ni tienda activa fácil de adivinar).
    const state = new MockSupabaseState({
      "product_combos:select": [
        {
          data: [
            {
              id: "combo-solo-1",
              name: "Combo Solo",
              slug: "combo-solo",
              description: "Item A + Item B",
              image_url: "/combo-solo.jpg",
              is_active: true,
              discount_type: "fixed_cop",
              discount_value: 0,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "product_combo_components:select": [
        {
          data: [
            {
              combo_id: "combo-solo-1",
              product_id: "solo-item-a",
              variant_id: null,
              quantity: 1,
            },
            {
              combo_id: "combo-solo-1",
              product_id: "solo-item-b",
              variant_id: null,
              quantity: 1,
            },
          ],
          error: null,
        },
      ],
      "store_items:select": [
        {
          data: [
            {
              id: "solo-item-a",
              item_name: "Item A",
              base_price: 20000,
              currency_code: "COP",
              track_inventory: false,
              inventory_quantity: 0,
              is_active: true,
              is_available_for_sale: true,
            },
            {
              id: "solo-item-b",
              item_name: "Item B",
              base_price: 10000,
              currency_code: "COP",
              track_inventory: false,
              inventory_quantity: 0,
              is_active: true,
              is_available_for_sale: true,
            },
          ],
          error: null,
        },
        // Consumida por resolveOrderStoreId al resolver store_id desde el
        // primer componente del combo (solo-item-a) vía store_items.
        { data: { store_id: "solo-store-uuid" }, error: null },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-solo-1",
            order_number: "A-SOLO",
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
              id: "combo-order-item-solo-1",
              order_id: "order-solo-1",
              product_id: null,
              product_name: "Combo Solo",
              quantity: 1,
              unit_price: 30000,
              total_price: 30000,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-solo-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const created = await createOrder({
      ...baseOrderData,
      subtotal: 0,
      total_amount: 0,
      items: [
        {
          product_name: "Combo Solo",
          unit_price: 0,
          quantity: 1,
          total_price: 0,
          metadata: {
            item_kind: "combo",
            combo_id: "combo-solo-1",
          },
        },
      ],
    });

    expect(created?.id).toBe("order-solo-1");

    const insertedOrder = state.inserts.orders?.[0];
    expect(insertedOrder.store_id).toBe("solo-store-uuid");
    // Exactamente UNA lectura de "stores": la carga de identidad de D27
    // (lib/checkout/order-writer.ts), nunca el fallback de tienda activa de
    // resolveOrderStoreId -- si ese fallback se hubiera alcanzado, habría una
    // segunda lectura además de esta.
    expect(state.fromCalls.filter((table) => table === "stores")).toHaveLength(1);
  });

  it("does not trust client-supplied combo snapshots to skip normal inventory validation", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: {
            track_inventory: true,
            inventory_quantity: 0,
            is_available_for_sale: true,
            is_active: true,
          },
          error: null,
        },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    await expect(
      createOrder({
        ...baseOrderData,
        items: [
          {
            product_id: "store-item-1",
            product_name: "Campera",
            unit_price: 100000,
            quantity: 1,
            total_price: 100000,
            metadata: {
              item_kind: "combo",
              combo_snapshot: {
                availability: { isAvailable: true, blockingComponents: [] },
                components: [],
              },
              comboSnapshot: {
                availability: { isAvailable: true, blockingComponents: [] },
                components: [],
              },
            },
          },
        ],
      }),
    ).rejects.toThrow("No hay suficiente stock disponible");

    expect(state.inserts.orders).toBeUndefined();
  });

  it("rejects stale cart combo items when the combo becomes inactive before checkout", async () => {
    const state = new MockSupabaseState({
      "product_combos:select": [
        {
          data: [
            {
              id: "combo-inactive",
              name: "Combo Inactivo",
              slug: "combo-inactivo",
              is_active: false,
              discount_type: "percentage",
              discount_value: 0,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "product_combo_components:select": [
        {
          data: [
            {
              combo_id: "combo-inactive",
              product_id: "store-item-1",
              variant_id: null,
              quantity: 1,
            },
            {
              combo_id: "combo-inactive",
              product_id: "store-item-2",
              variant_id: null,
              quantity: 1,
            },
          ],
          error: null,
        },
      ],
      "store_items:select": [
        {
          data: [
            {
              id: "store-item-1",
              item_name: "Café 250g",
              base_price: 30000,
              currency_code: "COP",
              track_inventory: true,
              inventory_quantity: 10,
              is_active: true,
              is_available_for_sale: true,
            },
            {
              id: "store-item-2",
              item_name: "Mug",
              base_price: 20000,
              currency_code: "COP",
              track_inventory: true,
              inventory_quantity: 10,
              is_active: true,
              is_available_for_sale: true,
            },
          ],
          error: null,
        },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    await expect(
      createOrder({
        ...baseOrderData,
        items: [
          {
            product_name: "Combo Inactivo",
            unit_price: 50000,
            quantity: 1,
            total_price: 50000,
            metadata: {
              item_kind: "combo",
              combo_id: "combo-inactive",
            },
          },
        ],
      }),
    ).rejects.toThrow("No hay suficiente stock disponible");

    expect(state.inserts.orders).toBeUndefined();
  });

  it("decrements product and variant inventory on writable base tables", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-1", base_price: 100000, currency_code: "COP" },
          ],
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
          data: [
            { id: "variant-1", price: 90000, item_id: "store-item-1" },
          ],
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
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

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

    // El descuento pasa por la RPC atómica ecommerce.decrement_inventory en
    // lugar de un update() directo por item; se verifica que reciba la
    // cantidad correcta para el producto y para la variante.
    const decrementCall = state.rpcCalls.find((call) => call.fn === "decrement_inventory");
    expect(decrementCall?.params).toMatchObject({ p_store_id: "store-uuid-1" });
    expect(decrementCall?.params.p_items).toEqual([
      { variant_id: null, product_id: "store-item-1", quantity: 2 },
      { variant_id: "variant-1", product_id: null, quantity: 3 },
    ]);
    expect(state.fromCalls).not.toContain("store_items_legacy");
  });

  it("deletes the newly created order and reports a 409-style validationResult when the atomic inventory RPC reports a shortage", async () => {
    // La atomicidad real del descuento (evitar sobreventa entre compras
    // concurrentes) es una garantía de la sentencia UPDATE condicional en
    // ecommerce.decrement_inventory (ver migración
    // 20260713000100_ecommerce_atomic_inventory.sql) y no es testeable con
    // este mock de supabase.rpc(). Este test verifica el WIRING de la
    // aplicación: cuando la RPC reporta faltantes, createOrder borra la
    // orden recién creada y lanza un error con el mismo formato 409 que
    // validateInventoryBeforeOrder.
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-shortage", base_price: 100000, currency_code: "COP" },
          ],
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
        {
          data: {
            store_id: "store-uuid-shortage",
            track_inventory: true,
            inventory_quantity: 5,
          },
          error: null,
        },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-shortage-1",
            order_number: "A-SHORTAGE",
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
              id: "item-shortage-1",
              order_id: "order-shortage-1",
              product_id: "store-item-shortage",
              product_name: "Campera",
              quantity: 5,
              unit_price: 100000,
              total_price: 500000,
              currency_code: "COP",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-shortage-1" }], error: null }],
      "orders:delete": [{ error: null }],
      "rpc:decrement_inventory": [
        {
          data: [
            {
              variant_id: null,
              product_id: "store-item-shortage",
              requested: 5,
              available: 2,
            },
          ],
          error: null,
        },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    let caughtError: any;
    try {
      await createOrder({
        ...baseOrderData,
        subtotal: 500000,
        total_amount: 500000,
        items: [
          {
            product_id: "store-item-shortage",
            product_name: "Campera",
            unit_price: 100000,
            quantity: 5,
            total_price: 500000,
          },
        ],
      });
      throw new Error("createOrder debía lanzar por faltante de stock");
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError.message).toContain("No hay suficiente stock disponible");
    expect(caughtError.validationResult).toEqual({
      isValid: false,
      errors: [
        {
          product_name: "Campera",
          product_id: "store-item-shortage",
          requested_quantity: 5,
          available_quantity: 2,
          message: "Solo hay 2 unidades disponibles de Campera. Solicitaste 5",
        },
      ],
    });

    expect(state.deletes.orders).toEqual([{ column: "id", value: "order-shortage-1" }]);
    expect(state.rpcCalls.some((call) => call.fn === "decrement_inventory")).toBe(true);
  });

  it("persists provider payment transaction payload when present on checkout metadata", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-1", base_price: 100000, currency_code: "COP" },
          ],
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
      "payment_transactions:insert": [{ data: [{ id: "txn-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

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

  // D21/D23: shipping_cost/shipping_status are recomputed the same way price
  // already is -- never trusted from the client, no matter what it claims
  // the resolution was. This store is the born default (coordinate, D11/D17,
  // see DEFAULT_IDENTITY_QUEUE_RESPONSES above), so the server-recomputed
  // pair is amount 0 / status "agreed" regardless of the tampered shipping_cost
  // and shipping_status the client sends below.
  it("recalculates authoritative totals and shipping resolution from the database, ignoring client-sent price/discount/shipping tampering", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-trusted", base_price: 40000, currency_code: "COP" },
          ],
          error: null,
        },
        {
          data: { track_inventory: false, inventory_quantity: 10 },
          error: null,
        },
        {
          data: { store_id: "store-uuid-trusted", track_inventory: false, inventory_quantity: 10 },
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
            id: "order-trusted-1",
            order_number: "A-TRUSTED",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
          error: null,
        },
      ],
      "order_items:insert": [
        {
          data: [
            {
              id: "item-trusted-1",
              order_id: "order-trusted-1",
              product_id: "store-item-trusted",
              product_name: "Reloj",
              quantity: 2,
              unit_price: 40000,
              total_price: 80000,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-trusted-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const created = await createOrder({
      ...baseOrderData,
      subtotal: 999999,
      total_amount: 999999,
      shipping_cost: 30000,
      shipping_status: "rate",
      tax_amount: 20000,
      discount_amount: -50000,
      items: [
        {
          product_id: "store-item-trusted",
          product_name: "Reloj",
          unit_price: 999999,
          quantity: 2,
          total_price: 999999,
        },
      ],
    });

    expect(state.inserts.orders?.[0]).toMatchObject({
      subtotal: 80000,
      shipping_cost: 0,
      shipping_status: "agreed",
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 80000,
    });

    const insertedItems = state.inserts.order_items?.[0] as Array<
      Record<string, any>
    >;
    expect(insertedItems[0].unit_price).toBe(40000);
    expect(insertedItems[0].total_price).toBe(80000);
    expect(created?.items[0].total_price).toBe(80000);
  });

  // D17: the one live public store is born mode=coordinate -- after this
  // slice deploys, its checkout must behave EXACTLY as before: shipping
  // stays 0 and the resolution recorded is "agreed", the deployment-safety
  // property the whole shipping plan rests on. No tampering, no own_rates
  // settings scripted -- this is the plain born-default path.
  it("keeps a coordinate-mode store's order at shipping_cost 0 and shipping_status agreed (D17 deployment safety)", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-deploy-safety", base_price: 20000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { store_id: "store-uuid-deploy-safety", track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-deploy-safety-1",
            order_number: "A-DEPLOY-SAFETY",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
          error: null,
        },
      ],
      "order_items:insert": [
        {
          data: [
            {
              id: "item-deploy-safety-1",
              order_id: "order-deploy-safety-1",
              product_id: "store-item-deploy-safety",
              product_name: "Campera",
              quantity: 1,
              unit_price: 20000,
              total_price: 20000,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-deploy-safety-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    await createOrder({
      ...baseOrderData,
      subtotal: 20000,
      total_amount: 20000,
      items: [
        {
          product_id: "store-item-deploy-safety",
          product_name: "Campera",
          unit_price: 20000,
          quantity: 1,
          total_price: 20000,
        },
      ],
    });

    expect(state.inserts.orders?.[0]).toMatchObject({
      shipping_cost: 0,
      shipping_status: "agreed",
      total_amount: 20000,
    });
  });

  it("placeCheckoutOrder forces payment_status=pending and a whitelisted payment_method even when the client sends inflated totals and payment_status=paid", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-trust-1", base_price: 45000, currency_code: "COP" },
          ],
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
        {
          data: { store_id: "store-uuid-trust-1", track_inventory: false, inventory_quantity: 10 },
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
            id: "order-trust-1",
            order_number: "A-TRUST-1",
            payment_method: "cash_on_delivery",
            payment_status: "pending",
            payment_reference: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
          error: null,
        },
      ],
      "order_items:insert": [
        {
          data: [
            {
              id: "item-trust-1",
              order_id: "order-trust-1",
              product_id: "store-item-trust-1",
              product_name: "Reloj",
              quantity: 1,
              unit_price: 45000,
              total_price: 45000,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-trust-1" }], error: null }],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({
      ...baseCheckoutInput,
      // Campos forzados que un cliente malicioso intenta decidir: el schema los
      // descarta y la action los fija desde la sesión y el repricing.
      customer_type: "user",
      user_id: "attacker-user",
      payment_status: "paid",
      payment_method: "credit_card",
      payment_reference: "fake-ref",
      subtotal: 999999,
      total_amount: 999999,
      items: [
        {
          product_id: "store-item-trust-1",
          product_name: "Reloj",
          unit_price: 999999,
          quantity: 1,
          total_price: 999999,
        },
      ],
    }, "idem-trust-1");

    expect(result).toMatchObject({
      success: true,
      orderNumber: "A-TRUST-1",
      orderId: "order-trust-1",
    });
    expect(state.inserts.orders?.[0]).toMatchObject({
      customer_type: "guest",
      user_id: null,
      payment_status: "pending",
      payment_method: "cash_on_delivery",
      subtotal: 45000,
      total_amount: 45000,
    });
    // Nunca la referencia falsa que intentó colar el cliente. La action deja
    // payment_reference sin definir a propósito (undefined), que Postgres
    // persiste como NULL vía p_order->>'payment_reference' en la RPC real --
    // este mock no serializa a JSON, así que aquí solo se puede probar que no
    // es el valor falso ni un string cualquiera.
    expect(state.inserts.orders?.[0].payment_reference).not.toBe("fake-ref");
  });

  it("enqueues exactly two outbox notifications (customer receipt + merchant notification) atomically with the order", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-email-1", base_price: 45000, currency_code: "COP" },
          ],
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
        {
          data: { store_id: "store-uuid-email-1", track_inventory: false, inventory_quantity: 10 },
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
            id: "order-email-flow-1",
            order_number: "A-EMAIL-1",
            payment_method: "cash_on_delivery",
            payment_status: "pending",
            payment_reference: null,
            customer_email: "buyer@example.com",
            customer_first_name: "Ada",
            customer_last_name: "Lovelace",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
          error: null,
        },
      ],
      "order_items:insert": [
        { data: [{ id: "item-email-flow-1" }], error: null },
      ],
      "order_addresses:insert": [{ data: [{ id: "addr-email-flow-1" }], error: null }],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({
      ...baseCheckoutInput,
      items: [
        {
          product_id: "store-item-email-1",
          product_name: "Reloj",
          unit_price: 45000,
          quantity: 1,
          total_price: 45000,
        },
      ],
    }, "idem-email-1");

    expect(result).toMatchObject({ success: true, orderNumber: "A-EMAIL-1" });

    // D12: exactly two events, built from the SAME atomic call -- not a
    // deferred best-effort send. D3: neither uses a tenant From domain.
    const rpcCall = state.rpcCalls.find((call) => call.fn === "create_order_with_notifications");
    const notifications = rpcCall?.params.p_notifications;
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n: any) => n.templateKind).sort()).toEqual([
      "merchant-new-order",
      "order-received",
    ]);
    for (const notification of notifications) {
      expect(notification.fromAddress).toBe("Tienda de prueba vía Osoria <pedidos@mail.osoria.help>");
    }
    const customerReceipt = notifications.find((n: any) => n.templateKind === "order-received");
    expect(customerReceipt.recipientEmail).toBe("buyer@example.com");
    const merchantNotification = notifications.find((n: any) => n.templateKind === "merchant-new-order");
    // El buzón de pedidos verificado (order_mailbox_email) del fixture por
    // defecto de identidad -- ver resolveMerchantRecipient.
    expect(merchantNotification.recipientEmail).toBe("pedidos@example.com");
  });

  // store_contact starts null-null for essentially every real store today
  // (ecommerce.provision_store never inserts a row, and
  // nothing in the live app writes contact_email), so resolveMerchantRecipient
  // must degrade gracefully instead of throwing before the atomic RPC is ever
  // called. Ready-store fixture shared by the two "exactly two, both modes"
  // tests below -- a store that satisfies every getStoreIdentityReadiness
  // check, in particular a VERIFIED order mailbox. A FACTORY, not a shared
  // object: MockSupabaseState.next() shifts scripted response arrays in
  // place, so a plain shared const would be drained by whichever test runs
  // first and leave the second one starved.
  const buildReadyStoreFixtures = () => ({
    "stores:select": [
      { data: { store_name: "Tienda lista", subdomain: "tienda-lista", legal_name: "Tienda Lista SAS" }, error: null },
    ],
    "store_contact:select": [
      {
        data: {
          contact_email: "contacto@tienda-lista.com",
          contact_phone: "3000000000",
          address: "Calle 1 # 2-3",
          reply_to_email: "responde@tienda-lista.com",
          reply_to_pending_email: null,
          reply_to_verified_at: "2026-01-01T00:00:00.000Z",
          order_mailbox_email: "pedidos@tienda-lista.com",
          order_mailbox_pending_email: null,
          order_mailbox_verified_at: "2026-01-01T00:00:00.000Z",
        },
        error: null,
      },
    ],
  });

  it("D31/D12: enqueues the customer receipt ALONE and makes the shortfall visible when the store has no merchant recipient and enforcement is off", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      "stores:select": [
        { data: { store_name: "Tienda incompleta", subdomain: "tienda-incompleta", legal_name: null }, error: null },
      ],
      "store_contact:select": [
        {
          data: {
            contact_email: null,
            contact_phone: null,
            address: null,
            reply_to_email: null,
            reply_to_pending_email: null,
            reply_to_verified_at: null,
            order_mailbox_email: null,
            order_mailbox_pending_email: null,
            order_mailbox_verified_at: null,
          },
          error: null,
        },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-null-null-1",
            order_number: "A-NULL-1",
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
      "order_items:insert": [{ data: [{ id: "item-null-null-1" }], error: null }],
      "order_addresses:insert": [{ data: [{ id: "addr-null-null-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const created = await createOrder(baseOrderData);

    expect(created?.id).toBe("order-null-null-1");

    const rpcCall = state.rpcCalls.find((call) => call.fn === "create_order_with_notifications");
    const notifications = rpcCall?.params.p_notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].templateKind).toBe("order-received");
    expect(notifications[0].recipientEmail).toBe("buyer@example.com");

    // D36's convention: the same structured JSON line shape the email-worker
    // Edge Function already emits, not a new observability mechanism.
    const shortfallLogged = warnSpy.mock.calls.some(([line]) => {
      if (typeof line !== "string") return false;
      try {
        const parsed = JSON.parse(line);
        return parsed.level === "warn" && String(parsed.msg).includes("no merchant recipient");
      } catch {
        return false;
      }
    });
    expect(shortfallLogged).toBe(true);

    warnSpy.mockRestore();
  });

  it("D12: a ready store still gets exactly two outbox notifications with enforcement off", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      ...buildReadyStoreFixtures(),
      "orders:insert": [
        {
          data: {
            id: "order-ready-off-1",
            order_number: "A-READY-OFF-1",
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
      "order_items:insert": [{ data: [{ id: "item-ready-off-1" }], error: null }],
      "order_addresses:insert": [{ data: [{ id: "addr-ready-off-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const created = await createOrder(baseOrderData);

    expect(created?.id).toBe("order-ready-off-1");
    const rpcCall = state.rpcCalls.find((call) => call.fn === "create_order_with_notifications");
    const notifications = rpcCall?.params.p_notifications;
    expect(notifications).toHaveLength(2);
    const merchantNotification = notifications.find((n: any) => n.templateKind === "merchant-new-order");
    expect(merchantNotification.recipientEmail).toBe("pedidos@tienda-lista.com");
  });

  it("D12: a ready store also gets exactly two outbox notifications with enforcement ON, and checkout succeeds", async () => {
    vi.stubEnv("CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS", "true");

    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      ...buildReadyStoreFixtures(),
      "orders:insert": [
        {
          data: {
            id: "order-ready-on-1",
            order_number: "A-READY-ON-1",
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
      "order_items:insert": [{ data: [{ id: "item-ready-on-1" }], error: null }],
      "order_addresses:insert": [{ data: [{ id: "addr-ready-on-1" }], error: null }],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const created = await createOrder(baseOrderData);

    expect(created?.id).toBe("order-ready-on-1");
    const rpcCall = state.rpcCalls.find((call) => call.fn === "create_order_with_notifications");
    const notifications = rpcCall?.params.p_notifications;
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n: any) => n.templateKind).sort()).toEqual([
      "merchant-new-order",
      "order-received",
    ]);
  });

  // D41: the four scenarios below each fail without the atomic checkout
  // write's guarantees -- D27's atomic rollback is proven separately, at the
  // real-Postgres level, by supabase/checks/verify-email-platform-contract.sql
  // (a JS mock cannot prove real transactional atomicity).

  it("D31: blocks checkout before any write when the identity readiness gate is enforced and the store is the genuine null-null empty state", async () => {
    vi.stubEnv("CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS", "true");

    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      "stores:select": [
        { data: { store_name: "Tienda incompleta", subdomain: "tienda-incompleta", legal_name: null }, error: null },
      ],
      "store_contact:select": [
        {
          // The real default state of essentially every store today has NO
          // row at all (ecommerce.provision_store never
          // inserts store_contact, and nothing in the live app ever writes
          // contact_email) -- contact_email null here, not the
          // "tienda@example.com" no real store actually has.
          data: {
            contact_email: null,
            contact_phone: null,
            address: null,
            reply_to_email: null,
            reply_to_pending_email: null,
            reply_to_verified_at: null,
            order_mailbox_email: null,
            order_mailbox_pending_email: null,
            order_mailbox_verified_at: null,
          },
          error: null,
        },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    await expect(createOrder(baseOrderData)).rejects.toThrow(StoreIdentityNotReadyError);

    expect(state.inserts.orders).toBeUndefined();
    expect(state.inserts.order_items).toBeUndefined();
    expect(state.inserts.email_outbox).toBeUndefined();
    expect(state.rpcCalls.some((call) => call.fn === "create_order_with_notifications")).toBe(false);
  });

  it("D28: returns the already-completed order on an identical retry instead of creating a second one", async () => {
    const existingOrder = {
      id: "order-existing-1",
      order_number: "A-EXISTING-1",
      store_id: "store-uuid-1",
      customer_email: "buyer@example.com",
      payment_status: "pending",
      payment_method: "cash_on_delivery",
      payment_reference: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const existingItems = [
      {
        id: "item-existing-1",
        order_id: "order-existing-1",
        product_id: "store-item-1",
        product_name: "Campera",
        quantity: 1,
        unit_price: 100000,
        total_price: 100000,
        currency_code: "COP",
      },
    ];

    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      "rpc:create_order_with_notifications": [
        { data: { ok: true, replayed: true, order: existingOrder, items: existingItems }, error: null },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const created = await createOrder(baseOrderData);

    expect(created?.id).toBe("order-existing-1");
    expect(created?.items).toEqual(existingItems);
    // D41: a replay must NOT short-circuit before the
    // follow-up writes -- a first attempt can die between the atomic RPC
    // succeeding and these running, so skipping them here on replay is
    // exactly what used to leave inventory never decremented. They run every
    // time, and converge instead of duplicating because each uses its own
    // natural key with ON CONFLICT DO NOTHING (order_addresses:
    // (order_id, address_type); decrement_inventory: a durable per-order
    // marker claimed inside the RPC's own transaction -- see
    // supabase/checks/verify-email-platform-contract.sql for the real-Postgres
    // proof that a genuine two-call retry converges to exactly one of each;
    // this mock only proves the wiring runs, not that Postgres deduplicates it).
    expect(state.inserts.order_addresses).toHaveLength(1);
    expect(state.upsertOptions.order_addresses?.[0]).toMatchObject({
      onConflict: "order_id,address_type",
      ignoreDuplicates: true,
    });
    expect(state.rpcCalls.some((call) => call.fn === "decrement_inventory")).toBe(true);
    // baseOrderData carries no provider payload in its metadata, so this
    // follow-up has nothing to insert either way -- unrelated to the replay
    // fix, same as before.
    expect(state.inserts.payment_transactions).toBeUndefined();
  });

  it("D28: rejects a reused idempotency key whose payload no longer matches the original request", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
        { data: { track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      "rpc:create_order_with_notifications": [
        { data: { ok: false, reason: "idempotency_conflict" }, error: null },
      ],
    });

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    await expect(createOrder(baseOrderData)).rejects.toThrow(CheckoutIdempotencyConflictError);

    expect(state.inserts.order_addresses).toBeUndefined();
  });

  it("placeCheckoutOrder surfaces a Spanish message when the identity readiness gate rejects an incomplete store", async () => {
    vi.stubEnv("CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS", "true");

    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10, is_available_for_sale: true, is_active: true }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      "stores:select": [
        { data: { store_name: "Tienda incompleta", subdomain: "tienda-incompleta", legal_name: null }, error: null },
      ],
      "store_contact:select": [
        {
          data: {
            contact_email: "tienda@example.com",
            contact_phone: null,
            address: null,
            reply_to_email: null,
            reply_to_pending_email: null,
            reply_to_verified_at: null,
            order_mailbox_email: null,
            order_mailbox_pending_email: null,
            order_mailbox_verified_at: null,
          },
          error: null,
        },
      ],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({ ...baseCheckoutInput }, "idem-incomplete-store");

    expect(result).toEqual({
      success: false,
      error: "Esta tienda todavía no completó su configuración y no puede recibir pedidos en este momento.",
    });
  });

  it("placeCheckoutOrder surfaces a Spanish message when the idempotency key is reused with a different payload", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        { data: [{ id: "store-item-1", base_price: 100000, currency_code: "COP" }], error: null },
        { data: { track_inventory: false, inventory_quantity: 10, is_available_for_sale: true, is_active: true }, error: null },
        { data: { store_id: "store-uuid-1", track_inventory: false, inventory_quantity: 10 }, error: null },
      ],
      "rpc:create_order_with_notifications": [
        { data: { ok: false, reason: "idempotency_conflict" }, error: null },
      ],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({ ...baseCheckoutInput }, "idem-conflict-1");

    expect(result).toEqual({
      success: false,
      error: "Tu carrito cambió desde el último intento. Actualiza la página e inténtalo de nuevo.",
    });
  });

  it("rejects malformed checkout input via safeParse without touching Supabase", async () => {
    const result = await placeCheckoutOrder({
      customer_email: "no-es-un-correo",
      items: [],
    }, "idem-malformed");

    expect(result).toEqual({
      success: false,
      error:
        "Los datos del pedido no son válidos. Revisa el formulario e intenta de nuevo.",
    });
    expect(getServiceEcommerceClientMock).not.toHaveBeenCalled();
  });

  it("normalizes an out-of-registry payment_method to the default enabled method", () => {
    const parsed = checkoutOrderSchema.parse({
      ...baseCheckoutInput,
      payment_method: "bitcoin",
    });

    expect(parsed.payment_method).toBe("cash_on_delivery");
    expect(enabledPaymentMethodIds()).toContain(parsed.payment_method);
  });

  it("stamps customer_type and user_id from the session cookie, not from the client payload", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "session-user-1" } },
      error: null,
    });

    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-1", base_price: 100000, currency_code: "COP" },
          ],
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
        {
          data: {
            store_id: "store-uuid-session-1",
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
            id: "order-session-1",
            order_number: "A-SESSION-1",
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
      "order_items:insert": [{ data: [{ id: "item-session-1" }], error: null }],
      "order_addresses:insert": [
        { data: [{ id: "addr-session-1" }], error: null },
      ],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({
      ...baseCheckoutInput,
      // El cliente intenta hacerse pasar por invitado y por otro usuario.
      customer_type: "guest",
      user_id: "attacker-user",
    }, "idem-session-1");

    expect(result).toMatchObject({ success: true, orderNumber: "A-SESSION-1" });
    expect(state.inserts.orders?.[0]).toMatchObject({
      customer_type: "user",
      user_id: "session-user-1",
    });
  });

  // D2/D30: before this slice, app/checkout/page.tsx hardcoded city: "" for
  // every authenticated order and checkoutOrderSchema had no destination
  // fields at all -- an authenticated purchase stored an empty city and no
  // department. This proves the authenticated write path now freezes
  // shipping_location_id AND the department alongside it, not just the city.
  //
  // A10: the frozen department/municipality text is never trusted from the
  // client -- the write path resolves it from ecommerce.co_locations by
  // shipping_location_id, the same way applyAuthoritativePricing already
  // ignores the client's price. The client payload below deliberately claims
  // Bogotá for a location id whose real catalog row is Antioquia/Medellín,
  // proving the stored row carries the CATALOG's destination, not the
  // client's disagreeing one.
  it("stores the catalog's frozen destination text for shipping_location_id, not the client's disagreeing one, for an authenticated order", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "session-user-destination-1" } },
      error: null,
    });

    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-1", base_price: 100000, currency_code: "COP" },
          ],
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
        {
          data: {
            store_id: "store-uuid-destination-1",
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
      "co_locations:select": [
        {
          data: {
            department_code: "05",
            department_name: "ANTIOQUIA",
            municipality_code: "05001",
            municipality_name: "MEDELLÍN",
          },
          error: null,
        },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-destination-1",
            order_number: "A-DESTINATION-1",
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
      "order_items:insert": [{ data: [{ id: "item-destination-1" }], error: null }],
      "order_addresses:insert": [
        { data: [{ id: "addr-destination-1" }], error: null },
      ],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({
      ...baseCheckoutInput,
      // El id apunta a Antioquia/Medellín (scripteado arriba); el texto que
      // manda el cliente miente y dice Bogotá para ese mismo id.
      shipping_location_id: "42",
      shipping_department_code: "11",
      shipping_department_name: "Bogotá, D.C.",
      shipping_city: "Bogotá",
      shipping_municipality_code: "11001",
    }, "idem-destination-1");

    expect(result).toMatchObject({ success: true, orderNumber: "A-DESTINATION-1" });
    expect(state.inserts.orders?.[0]).toMatchObject({
      shipping_location_id: "42",
      shipping_department_code: "05",
      shipping_department_name: "ANTIOQUIA",
      shipping_city: "MEDELLÍN",
      shipping_municipality_code: "05001",
    });
  });

  // A10: if the id the client submits does not resolve to a real
  // co_locations row (stale picker state, a tampered id), the order is never
  // written at all -- there is no partial or best-guess destination to fall
  // back to.
  it("does not create the order when shipping_location_id does not resolve in co_locations", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "session-user-destination-2" } },
      error: null,
    });

    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-1", base_price: 100000, currency_code: "COP" },
          ],
          error: null,
        },
      ],
      "co_locations:select": [
        { data: null, error: { message: "no rows found" } },
      ],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({
      ...baseCheckoutInput,
      shipping_location_id: "999999",
    }, "idem-destination-invalid-1");

    expect(result).toMatchObject({ success: false });
    expect(state.inserts.orders).toBeUndefined();
  });

  it("returns the 409-style validationResult in the action result when inventory runs short", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: [
            { id: "store-item-shortage", base_price: 100000, currency_code: "COP" },
          ],
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
        {
          data: {
            store_id: "store-uuid-shortage",
            track_inventory: true,
            inventory_quantity: 5,
          },
          error: null,
        },
      ],
      "orders:insert": [
        {
          data: {
            id: "order-shortage-2",
            order_number: "A-SHORTAGE-2",
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
              id: "item-shortage-2",
              order_id: "order-shortage-2",
              product_id: "store-item-shortage",
              product_name: "Campera",
              quantity: 5,
              unit_price: 100000,
              total_price: 500000,
              currency_code: "COP",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:insert": [
        { data: [{ id: "addr-shortage-2" }], error: null },
      ],
      "orders:delete": [{ error: null }],
      "rpc:decrement_inventory": [
        {
          data: [
            {
              variant_id: null,
              product_id: "store-item-shortage",
              requested: 5,
              available: 2,
            },
          ],
          error: null,
        },
      ],
    });

    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await placeCheckoutOrder({
      ...baseCheckoutInput,
      items: [
        {
          product_id: "store-item-shortage",
          product_name: "Campera",
          unit_price: 100000,
          quantity: 5,
          total_price: 500000,
        },
      ],
    }, "idem-shortage-2");

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("la action debía reportar el faltante de stock");
    }
    expect(result.error).toContain("No hay suficiente stock disponible");
    expect(result.validationResult).toEqual({
      isValid: false,
      errors: [
        {
          product_name: "Campera",
          product_id: "store-item-shortage",
          requested_quantity: 5,
          available_quantity: 2,
          message: "Solo hay 2 unidades disponibles de Campera. Solicitaste 5",
        },
      ],
    });
    expect(state.deletes.orders).toEqual([
      { column: "id", value: "order-shortage-2" },
    ]);
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
              addr_type: "shipping",
              address_line1: "Calle 123",
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

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const byId = await getOrderById("order-live-1", "store-live-1");
    const byNumber = await getOrderByNumber("A-2001", {
      storeId: "store-live-1",
      email: "buyer@example.com",
    });
    const adminList = await getOrders({ limit: 20, storeId: "store-live-1" });

    expect(byId?.payment_method).toBe("cash_on_delivery");
    expect(byId?.payment_status).toBe("pending");
    expect(byId?.payment_reference).toBe("manual-ref");
    expect(byId?.items).toHaveLength(1);
    expect(byId?.addresses?.[0]).toMatchObject({
      address_type: "shipping",
      address_line_1: "Calle 123",
    });

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

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const adminList = await getOrders({ limit: 20, storeId: "store-aligned-1" });
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

  it("hydrates success-page fallback (items, total, payment method) from the guest server order lookup when local state is missing", async () => {
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
      payment_method: "cash_on_delivery",
      payment_status: "pending",
      payment_reference: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const state = new MockSupabaseState({
      "orders:select": [{ data: orderRow, error: null }],
      "order_items:select": [
        {
          data: [
            {
              id: "item-success-1",
              order_id: "order-success-1",
              product_name: "Campera",
              quantity: 2,
              unit_price: 25000,
              total_price: 50000,
              currency_code: "COP",
            },
          ],
          error: null,
        },
      ],
      "order_addresses:select": [{ data: [], error: null }],
    });

    // La rama de invitado consulta con el service client (D7): el ANON client
    // por defecto no debería tocarse en este camino.
    getServiceEcommerceClientMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const fallback = await loadSuccessPageFallbackOrder("A-3001", {
      storeId: "store-success-1",
      email: "fallback@example.com",
    });

    expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    expect(fallback.orderNumber).toBe("A-3001");
    expect(fallback.customerData?.firstName).toBe("Grace");
    expect(fallback.customerData?.lastName).toBe("Hopper");
    expect(fallback.customerData?.email).toBe("fallback@example.com");
    expect(fallback.customerData?.address).toBe("Calle Fallback 10");
    expect(fallback.orderSummary).toEqual({
      items: [
        {
          id: "item-success-1",
          productName: "Campera",
          quantity: 2,
          unitPrice: 25000,
          totalPrice: 50000,
          currencyCode: "COP",
        },
      ],
      // D23: orderRow predates shipping_status (nullable since S9) -- the
      // mapper falls back to null rather than crashing on the missing column.
      subtotal: 50000,
      shippingCost: 0,
      shippingStatus: null,
      totalAmount: 50000,
      currencyCode: "COP",
      paymentMethod: "cash_on_delivery",
    });
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

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const order = await getOrderById("order-provider-1", "store-provider-1");

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

    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const orders = await getOrdersByEmail("email@example.com");

    expect(orders).toHaveLength(1);
    expect(orders[0].payment_method).toBe("cash_on_delivery");
    expect(orders[0].payment_status).toBe("pending");
    expect(state.fromCalls).toContain("orders");
  });
});
