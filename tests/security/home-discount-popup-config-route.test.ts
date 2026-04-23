import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/home-discount-popup-config/route";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";

const { createClient, cookies } = vi.hoisted(() => ({
  createClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  requireAdminUser: vi.fn(),
}));

const mockedRequireAdminUser = vi.mocked(requireAdminUser);

function makeCookieStore(storeId = "store-123") {
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

function makeStoresQuery() {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({
      data: { id: "store-123" },
      error: null,
    }),
  };

  return chain;
}

describe("home discount popup config route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
  });

  it("rejects non-admin requests before touching popup persistence", async () => {
    mockedRequireAdminUser.mockResolvedValue({
      error: "Acceso denegado",
      status: 403,
    });

    const ecommerceClient = {
      from: vi.fn(),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(ecommerceClient),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/home-discount-popup-config", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          config: {
            active: true,
            title: "Promo home",
            text: "Texto",
            ctaText: "Copiar cupon",
            coupon: "HOME10",
            ctaMode: "copy_coupon",
          },
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado",
    });
    expect(mockedRequireAdminUser).toHaveBeenCalledTimes(1);
    expect(ecommerceClient.from).not.toHaveBeenCalled();
  });

  it("merges popup config into store_integrations metadata through the service-role client", async () => {
    mockedRequireAdminUser.mockResolvedValue({ userId: "admin-1" });

    let upsertPayload: Record<string, unknown> | null = null;
    const storesQuery = makeStoresQuery();
    const integrationsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          metadata: {
            chatbot: { active: true },
          },
        },
        error: null,
      }),
      upsert: vi.fn(async (values: Record<string, unknown>) => {
        upsertPayload = values;
        return { error: null };
      }),
    };

    const ecommerceClient = {
      from: vi.fn((table: string) => {
        if (table === "stores") return storesQuery;
        if (table === "store_integrations") return integrationsQuery;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(ecommerceClient),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/home-discount-popup-config", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          config: {
            active: true,
            title: "Promo home",
            text: "Texto",
            ctaText: "Ir ahora",
            ctaUrl: "https://example.com/promo",
            ctaMode: "redirect",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: true }),
    );
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    expect(upsertPayload).toMatchObject({
      store_id: "store-123",
      metadata: {
        chatbot: { active: true },
        homeDiscountPopup: {
          active: true,
          ctaMode: "redirect",
          ctaUrl: "https://example.com/promo",
        },
      },
    });
  });
});
