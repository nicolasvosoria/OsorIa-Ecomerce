import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/home-composition/route";
import {
  ACTIVE_STORE_COOKIE,
  signActiveStore,
} from "@/lib/admin/active-store-cookie";

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

function makeExistingLayoutQuery(existingId?: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: existingId ? { id: existingId } : null,
      error: null,
    }),
  };
}

function makeRequest(body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/home-composition", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("home composition admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.ADMIN_COOKIE_SECRET = "test-cookie-secret";
    cookies.mockResolvedValue(makeCookieStore());
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
    });
  });

  it("rejects a payload whose sections is not an array", async () => {
    const response = await POST(makeRequest({ sections: "not-an-array" }));

    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects non-admin users before writing the composition", async () => {
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

    const response = await POST(
      makeRequest({ sections: [{ key: "hero", enabled: false }] }),
    );

    expect(response.status).toBe(403);
    expect(serviceSchema.from).not.toHaveBeenCalledWith("home_section_layout");
  });

  it("normalizes and upserts the composition for authenticated admins", async () => {
    const existingLayoutQuery = makeExistingLayoutQuery("layout-1");
    const updatedRow = {
      id: "layout-1",
      store_id: "store-1",
      sections: [{ key: "hero", enabled: false }],
      updated_at: "2026-07-08T12:00:00.000Z",
    };
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    };
    const layoutTable = {
      select: vi.fn().mockReturnValue(existingLayoutQuery),
      update: vi.fn().mockReturnValue(updateChain),
    };
    const serviceSchema = {
      rpc: makeCanManageStoreRpc(true),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "home_section_layout") return layoutTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      makeRequest({
        sections: [{ key: "hero", enabled: false }, { key: "bogus", enabled: true }],
      }),
    );

    expect(response.status).toBe(200);
    expect(layoutTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: expect.not.arrayContaining([
          expect.objectContaining({ key: "bogus" }),
        ]),
      }),
    );
    await expect(response.json()).resolves.toEqual({ data: updatedRow.sections });
  });

  it("writes to the signed active store instead of the host store", async () => {
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "layout-2", sections: [] },
        error: null,
      }),
    };
    const layoutTable = {
      select: vi.fn().mockReturnValue(makeExistingLayoutQuery("layout-2")),
      update: vi.fn().mockReturnValue(updateChain),
    };
    const serviceSchema = {
      rpc: makeCanManageStoreRpc(true),
      from: vi.fn((table: string) => {
        if (table === "stores_legacy") return makeStoresLegacyQuery("store-1");
        if (table === "home_section_layout") return layoutTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      makeRequest({ sections: [{ key: "hero", enabled: false }] }, {
        cookie: `${ACTIVE_STORE_COOKIE}=${signActiveStore("store-2")}`,
      }),
    );

    expect(response.status).toBe(200);
    expect(updateChain.eq).toHaveBeenCalledWith("store_id", "store-2");
  });
});
