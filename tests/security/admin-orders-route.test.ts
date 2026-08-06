import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, PATCH } from "@/app/api/admin/orders/route";

const { createServerClient, createClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("next/headers", () => ({
  cookies,
}));

const STORE_ID = "store-1";

function makeCookieStore() {
  return {
    get: vi.fn(() => undefined),
    set: vi.fn(),
  };
}

// D30: the route's PATCH now also reaches ecommerce.transition_order_status
// (lib/orders/order-status-writer.ts), so this stubs both RPCs the service
// schema is asked for -- membership (can_user_manage_store) and the status
// transition itself, echoing back the requested status the same way the real
// function returns the updated row.
function makeServiceRpc(canManage: boolean) {
  return vi.fn(async (fnName: string, params?: Record<string, unknown>) => {
    if (fnName === "can_user_manage_store") {
      return { data: canManage, error: null };
    }
    if (fnName === "transition_order_status") {
      return { data: { ok: true, order: { id: params?.p_order_id, status: params?.p_next_status } }, error: null };
    }
    throw new Error(`unexpected rpc ${fnName}`);
  });
}

// Service-role schema mock. Records every .eq() so tests can assert that the
// route scopes both the list read and the status write to the trusted store.
function makeServiceSchema(options: {
  canManage: boolean;
  orderRows?: any[];
}) {
  const { canManage, orderRows = [] } = options;
  const eqCalls: Array<{ table: string; column?: string; value?: unknown }> = [];
  const fromTables: string[] = [];

  function resolveFor(table: string) {
    switch (table) {
      case "stores_legacy":
        return { data: { id: STORE_ID }, error: null };
      case "orders":
        return { data: orderRows, error: null, count: orderRows.length };
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
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      eq: vi.fn((column?: string, value?: unknown) => {
        eqCalls.push({ table, column, value });
        return builder;
      }),
      single: vi.fn(async () => resolveFor(table)),
      maybeSingle: vi.fn(async () => resolveFor(table)),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolveFor(table)).then(onFulfilled, onRejected),
    };
    return builder;
  }

  const schema = {
    rpc: makeServiceRpc(canManage),
    from: vi.fn((table: string) => {
      fromTables.push(table);
      return makeBuilder(table);
    }),
  };

  return { schema, eqCalls, fromTables };
}

function makeGetRequest() {
  return new NextRequest("http://localhost/api/admin/orders?limit=20", {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
}

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/orders", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin orders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
    });
  });

  it("rejects an admin without membership before reading any order", async () => {
    const { schema, fromTables } = makeServiceSchema({ canManage: false });
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(403);
    expect(fromTables).not.toContain("orders");
  });

  it("returns only the trusted store's orders for an authorized admin", async () => {
    const orderRows = [
      {
        id: "order-1",
        store_id: STORE_ID,
        order_number: "A-1",
        status: "pending",
        payment_status: "pending",
        customer_email: "buyer@example.com",
        total_amount: 1000,
        currency_code: "COP",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    const { schema, eqCalls } = makeServiceSchema({
      canManage: true,
      orderRows,
    });
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.total).toBe(1);
    expect(payload.orders).toHaveLength(1);
    expect(payload.orders[0].id).toBe("order-1");
    expect(eqCalls).toContainEqual({
      table: "orders",
      column: "store_id",
      value: STORE_ID,
    });
  });

  it("rejects a status update from an admin without membership", async () => {
    const { schema, fromTables } = makeServiceSchema({ canManage: false });
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const response = await PATCH(
      makePatchRequest({ orderId: "order-1", status: "shipped" }),
    );

    expect(response.status).toBe(403);
    expect(schema.from).not.toHaveBeenCalledWith("orders");
    expect(fromTables).not.toContain("orders");
  });

  it("scopes the status update to the trusted store for an authorized admin", async () => {
    // D30: the status write now goes through ecommerce.transition_order_status,
    // which does its own store scoping INSIDE the locked function -- this
    // proves the route hands it the trusted store_id (never a client-supplied
    // one) and the authenticated admin's user_id. "confirmed" is a
    // non-lifecycle target (D11), so this stays a pure scoping/wiring test;
    // which notification kind attaches to which target status is covered by
    // tests/orders/order-status-writer.test.ts, and the graph/authorization
    // enforcement itself is proven against real Postgres in
    // verify-email-platform-contract.sql.
    const { schema } = makeServiceSchema({ canManage: true });
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const response = await PATCH(
      makePatchRequest({ orderId: "order-1", status: "confirmed" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(schema.rpc).toHaveBeenCalledWith(
      "transition_order_status",
      expect.objectContaining({
        p_order_id: "order-1",
        p_store_id: STORE_ID,
        p_user_id: "admin-1",
        p_next_status: "confirmed",
      }),
    );
  });

  it("rejects a malformed status payload", async () => {
    const { schema } = makeServiceSchema({ canManage: true });
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const response = await PATCH(
      makePatchRequest({ orderId: "order-1", status: "not-a-status" }),
    );

    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });
});
