import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/admin/popular-products/route";

const { createServerClient, createClient, cookies, getPopularProductCards } =
  vi.hoisted(() => ({
    createServerClient: vi.fn(),
    createClient: vi.fn(),
    cookies: vi.fn(),
    getPopularProductCards: vi.fn(),
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

vi.mock("@/lib/products/popular-sections", () => ({
  getPopularProductCards,
}));

function makeCookieStore(storeId = "store-1") {
  return {
    get: vi.fn((name: string) => {
      if (name === "store_id") {
        return { value: storeId };
      }

      return undefined;
    }),
    set: vi.fn(),
  };
}

function makeStoresLegacyQuery(storeId: string) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: { id: storeId }, error: null }),
  };

  return chain;
}

function makeCanManageStoreRpc(canManage: boolean) {
  return vi.fn(async (fnName: string) => {
    if (fnName !== "can_user_manage_store") {
      throw new Error(`unexpected rpc ${fnName}`);
    }

    return { data: canManage, error: null };
  });
}

function makeRequest() {
  return new NextRequest("http://localhost/api/admin/popular-products", {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
}

describe("popular products admin route", () => {
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

  it("rejects a user without membership before reading any product", async () => {
    const serviceSchema = {
      rpc: makeCanManageStoreRpc(false),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(getPopularProductCards).not.toHaveBeenCalled();
  });

  it("serves products to a store admin who can manage the trusted store", async () => {
    const serviceSchema = {
      rpc: makeCanManageStoreRpc(true),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });
    getPopularProductCards.mockResolvedValue([{ id: "p-1" }]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      products: [{ id: "p-1" }],
    });
  });
});
