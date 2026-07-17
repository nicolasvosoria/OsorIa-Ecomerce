import { beforeEach, describe, expect, it, vi } from "vitest";

// loadOrdersPageView (D5) resuelve la sesión con getSupabaseAuthClient (cookies)
// antes de tocar la base de datos: un invitado nunca dispara getOrdersForUser.
// La consulta en sí ya se prueba a nivel de orders-api
// (tests/orders/orders-api.store-scope.test.ts), así que aquí se aísla para
// probar solo la puerta de sesión y el mapeo hacia la vista de la página.
const { getSupabaseAuthClientMock, getOrdersForUserMock } = vi.hoisted(() => ({
  getSupabaseAuthClientMock: vi.fn(),
  getOrdersForUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}));

vi.mock("@/lib/supabase/orders-api", () => ({
  getOrdersForUser: getOrdersForUserMock,
}));

import { loadOrdersPageView } from "@/app/orders/load-orders-view";

function authClientFor(userId: string | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

const ORDER_FIXTURE = {
  order_number: "A-9001",
  order_date: "2026-07-01T00:00:00Z",
  total_amount: 50000,
  currency_code: "COP",
  status: "confirmed",
  payment_status: "paid",
  items: [{ id: "item-1" }, { id: "item-2" }],
};

describe("loadOrdersPageView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the guest view without querying orders when there is no session", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor(null));

    const view = await loadOrdersPageView();

    expect(view).toEqual({ authenticated: false });
    expect(getOrdersForUserMock).not.toHaveBeenCalled();
  });

  it("returns the guest view when no auth client is configured", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(null);

    const view = await loadOrdersPageView();

    expect(view).toEqual({ authenticated: false });
    expect(getOrdersForUserMock).not.toHaveBeenCalled();
  });

  it("maps the signed-in customer's orders into the list view", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor("user-1"));
    getOrdersForUserMock.mockResolvedValue([ORDER_FIXTURE]);

    const view = await loadOrdersPageView();

    expect(getOrdersForUserMock).toHaveBeenCalledWith("user-1", expect.anything());
    expect(view).toEqual({
      authenticated: true,
      orders: [
        {
          orderNumber: "A-9001",
          orderDate: "2026-07-01T00:00:00Z",
          totalAmount: 50000,
          currencyCode: "COP",
          status: "confirmed",
          paymentStatus: "paid",
          itemCount: 2,
        },
      ],
    });
  });

  it("returns an empty order list for a signed-in customer with no previous orders", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor("user-2"));
    getOrdersForUserMock.mockResolvedValue([]);

    const view = await loadOrdersPageView();

    expect(view).toEqual({ authenticated: true, orders: [] });
  });
});
