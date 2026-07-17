import { beforeEach, describe, expect, it, vi } from "vitest";

// loadSuccessPageFallbackOrder (D7) intenta primero la sesión (getSupabaseAuthClient)
// y solo si no hay sesión cae a la rama de invitado (service client + store_id/email).
// Las consultas reales (getOrderByNumber/getOrderByNumberForUser) ya se prueban a
// nivel de orders-api (tests/orders/orders-api.store-scope.test.ts), así que aquí se
// aíslan para probar solo el orden de las ramas, el "nunca cargar nada" y el mapeo
// hacia la pantalla de éxito.
const {
  getSupabaseAuthClientMock,
  getServiceEcommerceClientMock,
  getOrderByNumberMock,
  getOrderByNumberForUserMock,
} = vi.hoisted(() => ({
  getSupabaseAuthClientMock: vi.fn(),
  getServiceEcommerceClientMock: vi.fn(),
  getOrderByNumberMock: vi.fn(),
  getOrderByNumberForUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}));

vi.mock("@/lib/supabase/service-client", () => ({
  getServiceEcommerceClient: getServiceEcommerceClientMock,
}));

vi.mock("@/lib/supabase/orders-api", () => ({
  getOrderByNumber: getOrderByNumberMock,
  getOrderByNumberForUser: getOrderByNumberForUserMock,
}));

import { loadSuccessPageFallbackOrder } from "@/app/checkout/success/fallback-order";

function authClientFor(userId: string | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

const ORDER_FIXTURE = {
  order_number: "A-9001",
  customer_first_name: "Grace",
  customer_last_name: "Hopper",
  customer_email: "grace@example.com",
  customer_phone: "+57 300 000 0000",
  shipping_address: "Calle 1",
  shipping_city: "Bogotá",
  shipping_postal_code: "110111",
  shipping_country: "Colombia",
  shipping_notes: "",
  total_amount: 50000,
  currency_code: "COP",
  payment_method: "cash_on_delivery",
  items: [
    {
      id: "item-1",
      product_name: "Campera",
      quantity: 2,
      unit_price: 25000,
      total_price: 50000,
      currency_code: "COP",
    },
  ],
};

describe("loadSuccessPageFallbackOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads via the session client when the customer is signed in, without needing an email", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor("session-user-1"));
    getOrderByNumberForUserMock.mockResolvedValue(ORDER_FIXTURE);

    const fallback = await loadSuccessPageFallbackOrder("A-9001", null);

    expect(getOrderByNumberForUserMock).toHaveBeenCalledWith(
      "A-9001",
      "session-user-1",
      expect.anything(),
    );
    expect(getOrderByNumberMock).not.toHaveBeenCalled();
    expect(getServiceEcommerceClientMock).not.toHaveBeenCalled();
    expect(fallback.orderSummary?.items).toEqual([
      {
        id: "item-1",
        productName: "Campera",
        quantity: 2,
        unitPrice: 25000,
        totalPrice: 50000,
        currencyCode: "COP",
      },
    ]);
    expect(fallback.orderSummary?.totalAmount).toBe(50000);
    expect(fallback.orderSummary?.paymentMethod).toBe("cash_on_delivery");
    expect(fallback.customerData?.firstName).toBe("Grace");
  });

  it("falls back to the guest branch (service client + store_id/email) when there is no session", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor(null));
    const serviceClient = { marker: "service-client" };
    getServiceEcommerceClientMock.mockReturnValue(serviceClient);
    getOrderByNumberMock.mockResolvedValue(ORDER_FIXTURE);

    const fallback = await loadSuccessPageFallbackOrder("A-9001", {
      storeId: "store-1",
      email: "grace@example.com",
    });

    expect(getOrderByNumberForUserMock).not.toHaveBeenCalled();
    expect(getOrderByNumberMock).toHaveBeenCalledWith(
      "A-9001",
      { storeId: "store-1", email: "grace@example.com" },
      serviceClient,
    );
    expect(fallback.orderSummary?.totalAmount).toBe(50000);
  });

  it("never queries an order when neither a session nor guest auth resolves", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor(null));

    const fallback = await loadSuccessPageFallbackOrder("A-9001", null);

    expect(fallback).toEqual({
      orderNumber: "A-9001",
      customerData: null,
      orderSummary: null,
    });
    expect(getOrderByNumberForUserMock).not.toHaveBeenCalled();
    expect(getOrderByNumberMock).not.toHaveBeenCalled();
    expect(getServiceEcommerceClientMock).not.toHaveBeenCalled();
  });

  it("renders nothing when there is no order number at all", async () => {
    const fallback = await loadSuccessPageFallbackOrder(null, null);

    expect(fallback).toEqual({ orderNumber: null, customerData: null, orderSummary: null });
    expect(getSupabaseAuthClientMock).not.toHaveBeenCalled();
  });
});
