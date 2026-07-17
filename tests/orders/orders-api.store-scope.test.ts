import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMostRecentOrderByUserId,
  getOrderById,
  getOrderByNumber,
  getOrderByNumberForUser,
  getOrders,
  getOrdersByEmail,
  getOrdersForUser,
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

  const client = {
    from: vi.fn((table: string) => makeBuilder(table)),
  };

  return { client, eqCalls };
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

// Client that only resolves the orders row when every scripted `.eq()` filter
// on the "orders" table matches the row's own fields, mimicking the RLS
// backstop so tests can prove an order_number guess alone is not enough.
function makeAuthorizingClient() {
  function makeBuilder(table: string) {
    const filters: Record<string, unknown> = {};
    const builder: any = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      }),
      single: vi.fn(async () => {
        if (table !== "orders") {
          return { data: null, error: null };
        }
        const matches = Object.entries(filters).every(
          ([column, value]) => (ORDER_ROW as Record<string, unknown>)[column] === value,
        );
        return matches
          ? { data: ORDER_ROW, error: null }
          : { data: null, error: { message: "Not found" } };
      }),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
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

  it("filters updateOrderStatus by store_id when a storeId is provided", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const ok = await updateOrderStatus("order-1", "shipped", "store-1", client);

    expect(ok).toBe(true);
    expect(storeFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "store_id", value: "store-1" },
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
    getSupabaseEcommerceMock.mockReturnValue(makeAuthorizingClient());

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

  it("scopes getOrderByNumberForUser by the caller's user_id (checkout success, D7)", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const order = await getOrderByNumberForUser("A-1", "user-1", client);

    expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    expect(userIdFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "user_id", value: "user-1" },
    ]);
    expect(order?.id).toBe("order-1");
  });

  it("does not return an order from getOrderByNumberForUser when order_number is guessed but user_id does not match", async () => {
    const client = makeAuthorizingClient();

    const attacker = await getOrderByNumberForUser("A-1", "attacker-user", client);
    const owner = await getOrderByNumberForUser("A-1", "user-1", client);

    expect(attacker).toBeNull();
    expect(owner?.id).toBe("order-1");
  });

  it("scopes getMostRecentOrderByUserId by the caller's user_id (checkout prefill, D4)", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const order = await getMostRecentOrderByUserId("user-1", client);

    expect(userIdFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "user_id", value: "user-1" },
    ]);
    expect(order?.id).toBe("order-1");
  });

  it("scopes getOrdersForUser by the caller's user_id (order history, D5)", async () => {
    const { client, eqCalls } = makeRecordingClient();

    const orders = await getOrdersForUser("user-1", client);

    expect(getSupabaseEcommerceMock).not.toHaveBeenCalled();
    expect(userIdFilterFor(eqCalls)).toEqual([
      { table: "orders", column: "user_id", value: "user-1" },
    ]);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.id).toBe("order-1");
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

    const orders = await getOrdersForUser("user-without-orders", noOrdersClient);

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
