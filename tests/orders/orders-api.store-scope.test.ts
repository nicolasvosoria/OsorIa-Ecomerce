import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMostRecentOrderByUserId,
  getOrderById,
  getOrderByNumber,
  getOrderByNumberForUser,
  getOrders,
  getOrdersByEmail,
  getOrdersForUser,
  getStoreOrderByNumberForUser,
  updateOrderStatus,
} from "@/lib/supabase/orders-api";

const { getSupabaseEcommerceMock } = vi.hoisted(() => ({
  getSupabaseEcommerceMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: getSupabaseEcommerceMock,
}));

const ORDER_ROW = {
  id: "order-1",
  store_id: "store-1",
  order_number: "A-1",
  status: "pending",
  payment_status: "pending",
  customer_email: "buyer@example.com",
  user_id: "user-1",
  total_amount: 1000,
  currency_code: "COP",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// El mismo comprador, la misma plataforma, otra tienda: es el pedido que su
// historial en store-1 no puede enseñar (D17).
const ORDER_ROW_IN_ANOTHER_STORE = {
  ...ORDER_ROW,
  id: "order-2",
  store_id: "store-2",
  order_number: "B-1",
};

// Records every .eq() so each test can assert the store filter is applied.
function makeRecordingClient() {
  const eqCalls: Array<{ table: string; column?: string; value?: unknown }> = [];

  function resolveFor(table: string) {
    switch (table) {
      case "orders":
        return { data: [ORDER_ROW], error: null, count: 1 };
      case "order_items":
      case "order_addresses":
      case "payment_transactions":
        return { data: [], error: null };
      default:
        throw new Error(`unexpected table ${table}`);
    }
  }

  function makeBuilder(table: string) {
    const builder: any = {
      select: vi.fn(() => builder),
      update: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      eq: vi.fn((column?: string, value?: unknown) => {
        eqCalls.push({ table, column, value });
        return builder;
      }),
      single: vi.fn(async () => ({ data: ORDER_ROW, error: null })),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolveFor(table)).then(onFulfilled, onRejected),
    };
    return builder;
  }

  const rpcCalls: Array<{ fn: string; params: any }> = [];
  const client = {
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: vi.fn((fn: string, params: any) => {
      rpcCalls.push({ fn, params });
      return Promise.resolve({ data: { ok: true, order: ORDER_ROW }, error: null });
    }),
  };

  return { client, eqCalls, rpcCalls };
}

function storeFilterFor(
  eqCalls: Array<{ table: string; column?: string; value?: unknown }>,
) {
  return eqCalls.filter(
    (call) => call.table === "orders" && call.column === "store_id",
  );
}

function emailFilterFor(
  eqCalls: Array<{ table: string; column?: string; value?: unknown }>,
) {
  return eqCalls.filter(
    (call) => call.table === "orders" && call.column === "customer_email",
  );
}

function userIdFilterFor(
  eqCalls: Array<{ table: string; column?: string; value?: unknown }>,
) {
  return eqCalls.filter(
    (call) => call.table === "orders" && call.column === "user_id",
  );
}

// Client that actually applies every scripted `.eq()` to the seeded orders,
// mimicking the RLS + WHERE backstop. Recording the filters only proves what was
// asked; this one proves which rows come back, which is what a leak is about.
function makeFilteringClient(orderRows: Array<Record<string, unknown>>) {
  function makeBuilder(table: string) {
    const filters: Record<string, unknown> = {};
    const matchingRows = () =>
      table === "orders"
        ? orderRows.filter((row) =>
            Object.entries(filters).every(([column, value]) => row[column] === value),
          )
        : [];

    const builder: any = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      }),
      single: vi.fn(async () => {
        const found = matchingRows();
        return found.length === 1
          ? { data: found[0], error: null }
          : { data: null, error: { code: "PGRST116", message: "No rows found" } };
      }),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve({ data: matchingRows(), error: null }).then(onFulfilled, onRejected),
    };
    return builder;
  }

  return { from: vi.fn((table: string) => makeBuilder(table)) };
}

describe("orders-api store scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always scopes getOrders by the required store_id", async () => {
    const { client, eqCalls } = makeRecordingClient();

    await getOrders({ limit: 5, storeId: "store-1" }, client);

    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
    ]);
  });

  it("always scopes getOrderById by the required store_id", async () => {
    const { client, eqCalls } = makeRecordingClient();
    getSupabaseEcommerceMock.mockReturnValue(client);

    await getOrderById("order-1", "store-1");

    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
    ]);
  });

  it("filters getOrdersByEmail by store_id when a storeId is provided", async () => {
    const { client, eqCalls } = makeRecordingClient();
    getSupabaseEcommerceMock.mockReturnValue(client);

    await getOrdersByEmail("buyer@example.com", 10, "store-1");

    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
    ]);
  });

  // D30: updateOrderStatus now goes through ecommerce.transition_order_status
  // (lib/orders/order-status-writer.ts), which does its own store scoping and
  // authorization INSIDE the locked function -- this proves the TS wiring
  // hands it the right store_id/user_id. "confirmed" is deliberately a
  // non-lifecycle target (D11): it never enqueues a notification, so this
  // stays a pure RPC-wiring test. Real graph/authorization/tenant enforcement
  // is proven against real Postgres in verify-email-platform-contract.sql.
  it("passes store_id and user_id to ecommerce.transition_order_status", async () => {
    const { client, rpcCalls } = makeRecordingClient();

    const ok = await updateOrderStatus("order-1", "confirmed", "store-1", "user-1", client);

    expect(ok).toBe(true);
    expect(rpcCalls).toEqual([
      {
        fn: "transition_order_status",
        params: {
          p_order_id: "order-1",
          p_store_id: "store-1",
          p_user_id: "user-1",
          p_next_status: "confirmed",
          p_notification: null,
        },
      },
    ]);
  });

  it("always scopes getOrderByNumber by store_id and customer_email", async () => {
    const { client, eqCalls } = makeRecordingClient();
    getSupabaseEcommerceMock.mockReturnValue(client);

    await getOrderByNumber("A-1", {
      storeId: "store-1",
      email: "buyer@example.com",
    });

    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
    ]);
    expect(emailFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "customer_email", value: "buyer@example.com" },
    ]);
  });

  it("does not return an order when order_number is guessed but store_id or email do not match", async () => {
    getSupabaseEcommerceMock.mockReturnValue(makeFilteringClient([ORDER_ROW]));

    const wrongStore = await getOrderByNumber("A-1", {
      storeId: "store-2",
      email: "buyer@example.com",
    });
    const wrongEmail = await getOrderByNumber("A-1", {
      storeId: "store-1",
      email: "attacker@example.com",
    });
    const owner = await getOrderByNumber("A-1", {
      storeId: "store-1",
      email: "buyer@example.com",
    });

    expect(wrongStore).toBeNull();
    expect(wrongEmail).toBeNull();
    expect(owner?.id).toBe("order-1");
  });

  it("uses the provided supabaseOverride client for getOrderByNumber instead of the default client", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const order = await getOrderByNumber(
      "A-1",
      { storeId: "store-1", email: "buyer@example.com" },
      client,
    );

    expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
    ]);
    expect(emailFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "customer_email", value: "buyer@example.com" },
    ]);
    expect(order?.id).toBe("order-1");
  });

  // D17 deja esta función DELIBERADAMENTE sin filtro de tienda: la comparte la
  // pantalla de éxito del checkout, que tiene que resolver el pedido recién
  // hecho aunque la tienda del host no se resuelva en ese request. Acotarla
  // aquí rompería esa confirmación, así que el assert vacío es el que avisa.
  it("scopes getOrderByNumberForUser by user_id only, never by store_id (checkout success, D7/D17)", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const order = await getOrderByNumberForUser("A-1", "user-1", client);

    expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    expect(userIdFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "user_id", value: "user-1" },
    ]);
    expect(storeFilterFor(eqCalls)).toEqual([]);
    expect(order?.id).toBe("order-1");
  });

  it("resolves a just-placed order from another store through getOrderByNumberForUser", async () => {
    const client = makeFilteringClient([ORDER_ROW, ORDER_ROW_IN_ANOTHER_STORE]);

    const order = await getOrderByNumberForUser("B-1", "user-1", client);

    expect(order?.id).toBe("order-2");
  });

  it("does not return an order from getOrderByNumberForUser when order_number is guessed but user_id does not match", async () => {
    const client = makeFilteringClient([ORDER_ROW]);

    const attacker = await getOrderByNumberForUser("A-1", "attacker-user", client);
    const owner = await getOrderByNumberForUser("A-1", "user-1", client);

    expect(attacker).toBeNull();
    expect(owner?.id).toBe("order-1");
  });

  it("scopes getStoreOrderByNumberForUser by both store_id and user_id (order detail, D17)", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const order = await getStoreOrderByNumberForUser(
      "A-1",
      { storeId: "store-1", userId: "user-1" },
      client,
    );

    expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
    ]);
    expect(userIdFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "user_id", value: "user-1" },
    ]);
    expect(order?.id).toBe("order-1");
  });

  it("hides an order placed in another store from getStoreOrderByNumberForUser, even from its owner", async () => {
    const client = makeFilteringClient([ORDER_ROW, ORDER_ROW_IN_ANOTHER_STORE]);

    const fromAnotherStore = await getStoreOrderByNumberForUser(
      "B-1",
      { storeId: "store-1", userId: "user-1" },
      client,
    );
    const ownStore = await getStoreOrderByNumberForUser(
      "A-1",
      { storeId: "store-1", userId: "user-1" },
      client,
    );

    expect(fromAnotherStore).toBeNull();
    expect(ownStore?.id).toBe("order-1");
  });

  // El recorte por tienda no puede haber abierto un camino que se salte la
  // propiedad: acertar tienda y número sigue sin bastar.
  it("does not return an order from getStoreOrderByNumberForUser when the store matches but user_id does not", async () => {
    const client = makeFilteringClient([ORDER_ROW]);

    const attacker = await getStoreOrderByNumberForUser(
      "A-1",
      { storeId: "store-1", userId: "attacker-user" },
      client,
    );

    expect(attacker).toBeNull();
  });

  it("scopes getMostRecentOrderByUserId by the caller's user_id (checkout prefill, D4)", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const order = await getMostRecentOrderByUserId("user-1", client);

    expect(userIdFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "user_id", value: "user-1" },
    ]);
    expect(order?.id).toBe("order-1");
  });

  // Antes este test fijaba lo contrario: el historial filtraba solo por user_id
  // y por tanto mezclaba tiendas. D17 lo cambia — el cliente no sabe que detrás
  // hay una plataforma, así que su historial en esta tienda es solo de aquí.
  it("scopes getOrdersForUser by the caller's user_id AND the current store (order history, D5/D17)", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const orders = await getOrdersForUser({ storeId: "store-1", userId: "user-1" }, client);

    expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    expect(userIdFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "user_id", value: "user-1" },
    ]);
    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
    ]);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.id).toBe("order-1");
  });

  it("leaves an order placed in another store out of getOrdersForUser", async () => {
    const client = makeFilteringClient([ORDER_ROW, ORDER_ROW_IN_ANOTHER_STORE]);

    const orders = await getOrdersForUser({ storeId: "store-1", userId: "user-1" }, client);

    expect(orders.map((order) => order.id)).toEqual(["order-1"]);
  });

  it("returns an empty list from getOrdersForUser when the customer has no previous orders", async () => {
    const noOrdersClient = {
      from: vi.fn(() => {
        const builder: any = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          then: (onFulfilled: any, onRejected: any) =>
            Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
        };
        return builder;
      }),
    };

    const orders = await getOrdersForUser(
      { storeId: "store-1", userId: "user-without-orders" },
      noOrdersClient,
    );

    expect(orders).toEqual([]);
  });

  it("returns null from getMostRecentOrderByUserId when the customer has no previous orders", async () => {
    const noOrdersClient = {
      from: vi.fn(() => {
        const builder: any = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          single: vi.fn(async () => ({
            data: null,
            error: { code: "PGRST116", message: "No rows found" },
          })),
        };
        return builder;
      }),
    };

    const order = await getMostRecentOrderByUserId("user-without-orders", noOrdersClient);

    expect(order).toBeNull();
  });
});
