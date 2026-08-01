import { beforeEach, describe, expect, it, vi } from "vitest";

// loadOrdersPageView (D5) resuelve la sesión con getSupabaseAuthClient (cookies)
// y la tienda del host antes de tocar la base de datos: un invitado nunca
// dispara getOrdersForUser y una tienda sin resolver tampoco. La consulta en sí
// ya se prueba a nivel de orders-api (tests/orders/orders-api.store-scope.test.ts),
// así que aquí se aísla para probar la puerta de sesión, la de tienda y el mapeo
// hacia la vista de la página.
const { getSupabaseAuthClientMock, getRuntimeStoreIdMock, getOrdersForUserMock } = vi.hoisted(
  () => ({
    getSupabaseAuthClientMock: vi.fn(),
    getRuntimeStoreIdMock: vi.fn(),
    getOrdersForUserMock: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}));

vi.mock("@/lib/utils/store", () => ({
  getRuntimeStoreId: getRuntimeStoreIdMock,
}));

vi.mock("@/lib/supabase/orders-api", () => ({
  getOrdersForUser: getOrdersForUserMock,
}));

import { loadOrdersPageView } from "@/app/orders/load-orders-view";
import {
  createSessionAuthClient,
  ECOMMERCE_SCOPED_CLIENT,
} from "@/tests/fixtures/session-auth-client";

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
    getRuntimeStoreIdMock.mockResolvedValue("store-1");
  });

  it("returns the guest view without querying orders when there is no session", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient(null));

    const view = await loadOrdersPageView();

    expect(view).toEqual({ status: "guest" });
    expect(getOrdersForUserMock).not.toHaveBeenCalled();
  });

  it("returns the guest view when no auth client is configured", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(null);

    const view = await loadOrdersPageView();

    expect(view).toEqual({ status: "guest" });
    expect(getOrdersForUserMock).not.toHaveBeenCalled();
  });

  // Devolver [] aquí le diría a un cliente con pedidos que no tiene ninguno:
  // exactamente la mentira que D17 no admite.
  it("reports the store as unresolved instead of an empty history when the host has no store", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-1"));
    getRuntimeStoreIdMock.mockResolvedValue(null);

    const view = await loadOrdersPageView();

    expect(view).toEqual({ status: "storeUnresolved" });
    expect(getOrdersForUserMock).not.toHaveBeenCalled();
  });

  it("maps the signed-in customer's orders of the current store into the list view", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-1"));
    getOrdersForUserMock.mockResolvedValue([ORDER_FIXTURE]);

    const view = await loadOrdersPageView();

    // El store_id viaja siempre (D17) y el cliente va acotado a ecommerce: las
    // tablas de pedidos no existen en el schema public donde nace la sesión.
    expect(getOrdersForUserMock).toHaveBeenCalledWith(
      { storeId: "store-1", userId: "user-1" },
      ECOMMERCE_SCOPED_CLIENT,
    );
    expect(view).toEqual({
      status: "history",
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

  it("returns an empty order list for a signed-in customer with no orders in this store", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-2"));
    getOrdersForUserMock.mockResolvedValue([]);

    const view = await loadOrdersPageView();

    expect(view).toEqual({ status: "history", orders: [] });
  });
});
