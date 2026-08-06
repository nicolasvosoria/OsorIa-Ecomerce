import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// D22's regression gap: proxy.ts's global invited-session gate NEVER runs for
// `/api/*` (its own `config.matcher` excludes the whole tree -- see proxy.ts),
// so a Route Handler that resolves an identity and grants on it needed its own
// enforcement. The fix lives in lib/supabase/admin-route-auth.ts's
// authorizeAnyCandidate -- the ONE choke point authorizeStoreAdmin and
// requireSuperAdmin both funnel through.
//
// What this file proves, and how:
//   - The "authorizeAnyCandidate / D22" suite calls the exported function
//     directly with a hand-built authorizeCandidate callback: a pure unit
//     test of the disqualification rule itself (invited-pending never
//     reaches the callback; a non-invited candidate does; a bearer candidate
//     is judged independently of the cookie candidate).
//   - The "admin API routes" suite imports the REAL, unmocked GET
//     (app/api/admin/orders/route.ts, a read) and POST
//     (app/api/admin/shop-config/route.ts, a write) Route Handlers and
//     invokes them exactly as Next.js would for a matching request -- the
//     same pattern tests/security/admin-orders-route.test.ts and
//     admin-shop-config-route.test.ts already use. Only the raw Supabase SDK
//     boundary (@supabase/ssr's createServerClient, @supabase/supabase-js's
//     createClient, next/headers' cookies) is mocked; authorizeStoreAdmin,
//     authorizeAnyCandidate and isInvitedPendingPasswordMetadata all run for
//     real, unmocked.
//
// This is function-level, not a live HTTP request against a running server:
// this repo's test setup is vitest-only (no supertest/playwright/next-test-
// api-route-handler and no boot-a-real-server harness), so there is no
// lighter-weight way to exercise "what Next.js calls when a request lands on
// this route" than calling the exported handler itself -- Route Handlers,
// unlike proxy.ts, have no config.matcher or other framework layer that could
// exclude a request before it reaches them, so invoking the handler directly
// IS invoking the same code Next's router would dispatch to. What this DOES
// prove: the exact code path a matching request reaches, unmocked from the
// authorization layer down, rejects an invited-pending session and accepts a
// normal one, for both a read and a write. What it does NOT prove: an actual
// network round trip through a running Next.js process. That remaining gap is
// covered by this slice's manual live reproduction against a running dev
// server and local Supabase (see the report), not by this automated suite.
const { createServerClient, createClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("next/headers", () => ({ cookies }));

function makeCookieStore() {
  return { get: vi.fn(() => undefined), set: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  cookies.mockResolvedValue(makeCookieStore());
});

describe("authorizeAnyCandidate / D22", () => {
  function makeRequest(headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost/api/admin/orders", { headers });
  }

  it("never lets an invited-pending candidate reach the authorizer, even one that would grant", async () => {
    const { authorizeAnyCandidate } = await import("@/lib/supabase/admin-route-auth");
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "invited-1", app_metadata: { invited_pending_password: true } },
          },
          error: null,
        }),
      },
    });
    const authorizeCandidate = vi.fn().mockResolvedValue({ authorized: true, grant: "store-1" });

    const result = await authorizeAnyCandidate(makeRequest(), authorizeCandidate);

    expect("error" in result && result.status).toBe(403);
    expect(authorizeCandidate).not.toHaveBeenCalled();
  });

  it("authorizes a normal, non-invited session with the same membership", async () => {
    const { authorizeAnyCandidate } = await import("@/lib/supabase/admin-route-auth");
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-1", app_metadata: {} } },
          error: null,
        }),
      },
    });
    const authorizeCandidate = vi.fn().mockResolvedValue({ authorized: true, grant: "store-1" });

    const result = await authorizeAnyCandidate(makeRequest(), authorizeCandidate);

    expect("error" in result).toBe(false);
    expect((result as { userId: string }).userId).toBe("admin-1");
    expect(authorizeCandidate).toHaveBeenCalledWith("admin-1");
  });

  it("judges the bearer candidate on its own: a non-invited preview token still authorizes even while the cookie session is invited-pending", async () => {
    const { authorizeAnyCandidate } = await import("@/lib/supabase/admin-route-auth");
    const getUser = vi.fn((accessToken?: string) =>
      Promise.resolve(
        accessToken
          ? { data: { user: { id: "preview-1", app_metadata: {} } }, error: null }
          : {
              data: {
                user: { id: "invited-1", app_metadata: { invited_pending_password: true } },
              },
              error: null,
            },
      ),
    );
    createServerClient.mockReturnValue({ auth: { getUser } });
    const authorizeCandidate = vi.fn().mockResolvedValue({ authorized: true, grant: "store-1" });

    const result = await authorizeAnyCandidate(
      makeRequest({ authorization: "Bearer preview-token" }),
      authorizeCandidate,
    );

    expect("error" in result).toBe(false);
    expect((result as { userId: string }).userId).toBe("preview-1");
    expect(authorizeCandidate).toHaveBeenCalledTimes(1);
    expect(authorizeCandidate).toHaveBeenCalledWith("preview-1");
  });

  it("falls through to the standard 403 denial, not a distinct error shape, once every candidate is disqualified", async () => {
    const { authorizeAnyCandidate } = await import("@/lib/supabase/admin-route-auth");
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "invited-1", app_metadata: { invited_pending_password: true } },
          },
          error: null,
        }),
      },
    });
    const authorizeCandidate = vi.fn();

    const result = await authorizeAnyCandidate(makeRequest(), authorizeCandidate);

    expect(result).toEqual({ error: "Acceso denegado", status: 403 });
  });
});

describe("admin API routes reject an invited-pending session (D22)", () => {
  const STORE_ID = "store-1";

  function mockSession(appMetadata: Record<string, unknown>) {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "admin-1", app_metadata: appMetadata } }, error: null }),
      },
    });
  }

  // Mirrors tests/security/admin-orders-route.test.ts's service schema stub.
  function makeOrdersServiceSchema(canManage: boolean) {
    const rpc = vi.fn(async (fnName: string) => {
      if (fnName === "can_user_manage_store") return { data: canManage, error: null };
      throw new Error(`unexpected rpc ${fnName}`);
    });
    const fromTables: string[] = [];

    function resolveFor(table: string) {
      switch (table) {
        case "stores_legacy":
          return { data: { id: STORE_ID }, error: null };
        case "orders":
          return { data: [], error: null, count: 0 };
        default:
          throw new Error(`unexpected table ${table}`);
      }
    }

    function makeBuilder(table: string) {
      const builder: any = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        range: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        single: vi.fn(async () => resolveFor(table)),
        maybeSingle: vi.fn(async () => resolveFor(table)),
        then: (onFulfilled: any, onRejected: any) =>
          Promise.resolve(resolveFor(table)).then(onFulfilled, onRejected),
      };
      return builder;
    }

    return {
      rpc,
      from: vi.fn((table: string) => {
        fromTables.push(table);
        return makeBuilder(table);
      }),
      fromTables,
    };
  }

  function makeShopConfigServiceSchema(canManage: boolean) {
    const rpc = vi.fn(async (fnName: string) => {
      if (fnName !== "can_user_manage_store") throw new Error(`unexpected rpc ${fnName}`);
      return { data: canManage, error: null };
    });
    const storesLegacyQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: STORE_ID }, error: null }),
    };
    // Existing config row present, so a successful POST takes the .update()
    // branch (matches tests/security/admin-shop-config-route.test.ts).
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "config-1", config: { defaultSort: null } },
        error: null,
      }),
    };
    const shopConfigTable = {
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "config-1" }, error: null }),
      })),
      update: vi.fn(() => updateChain),
    };

    return {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return storesLegacyQuery;
        if (table === "shop_config") return shopConfigTable;
        throw new Error(`unexpected table ${table}`);
      }),
      shopConfigTable,
    };
  }

  it("READ -- GET /api/admin/orders returns 403 (not 200) for an invited-pending session that already holds a real admin membership", async () => {
    mockSession({ invited_pending_password: true });
    const schema = makeOrdersServiceSchema(true); // membership already granted, as production creates it
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const { GET } = await import("@/app/api/admin/orders/route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/orders?limit=20", {
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(403);
    // The verifier's live bypass returned real order rows: prove the fixed
    // route never even reaches store resolution or the orders table for this
    // identity -- disqualified before authorizeCandidate ever runs.
    expect(schema.rpc).not.toHaveBeenCalled();
    expect(schema.fromTables).not.toContain("orders");
  });

  it("READ -- GET /api/admin/orders still returns 200 for a normal admin with the identical membership", async () => {
    mockSession({});
    const schema = makeOrdersServiceSchema(true);
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const { GET } = await import("@/app/api/admin/orders/route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/orders?limit=20", {
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
  });

  it("WRITE -- POST /api/admin/shop-config returns 403 (not 200) for an invited-pending session and never persists the write", async () => {
    mockSession({ invited_pending_password: true });
    const schema = makeShopConfigServiceSchema(true);
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const { POST } = await import("@/app/api/admin/shop-config/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/shop-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: { defaultSort: "newest" } }),
      }),
    );

    expect(response.status).toBe(403);
    // The verifier's live bypass persisted the write to ecommerce.shop_config:
    // prove the fixed route never even resolves the active store or calls
    // .update() for this identity -- disqualified before authorizeCandidate
    // ever runs.
    expect(schema.rpc).not.toHaveBeenCalled();
    expect(schema.shopConfigTable.update).not.toHaveBeenCalled();
  });

  it("WRITE -- POST /api/admin/shop-config still returns 200 for a normal admin with the identical membership", async () => {
    mockSession({});
    const schema = makeShopConfigServiceSchema(true);
    createClient.mockReturnValue({ schema: vi.fn().mockReturnValue(schema) });

    const { POST } = await import("@/app/api/admin/shop-config/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/shop-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: { defaultSort: "newest" } }),
      }),
    );

    expect(response.status).toBe(200);
  });
});
