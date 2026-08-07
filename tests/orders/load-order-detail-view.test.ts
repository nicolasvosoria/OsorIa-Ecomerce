import { beforeEach, describe, expect, it, vi } from "vitest";

// loadOrderDetailView (D17/D20) pasa las dos mismas puertas que el historial
// —sesión y tienda— antes de consultar nada, y delega la propiedad a la query.
// El recorte por tienda y la prueba de dueño se cubren contra el doble de tabla
// en tests/orders/orders-api.store-scope.test.ts; aquí se aísla para probar las
// puertas, el mapeo y qué se le enseña a quien no es el dueño.
const {
  getSupabaseAuthClientMock,
  getRuntimeStoreIdMock,
  getStoreOrderByNumberForUserMock,
} = vi.hoisted(() => ({
  getSupabaseAuthClientMock: vi.fn(),
  getRuntimeStoreIdMock: vi.fn(),
  getStoreOrderByNumberForUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}));

vi.mock("@/lib/utils/store", () => ({
  getRuntimeStoreId: getRuntimeStoreIdMock,
}));

vi.mock("@/lib/supabase/orders-api", () => ({
  getStoreOrderByNumberForUser: getStoreOrderByNumberForUserMock,
}));

import { loadOrderDetailView } from "@/app/orders/[orderNumber]/load-order-detail-view";
import {
  createSessionAuthClient,
  ECOMMERCE_SCOPED_CLIENT,
} from "@/tests/fixtures/session-auth-client";

const ORDER_FIXTURE = {
  order_number: "A-9001",
  order_date: "2026-07-01T00:00:00Z",
  status: "confirmed",
  payment_status: "paid",
  payment_method: "cash_on_delivery",
  currency_code: "COP",
  subtotal: 48000,
  shipping_cost: 2000,
  total_amount: 50000,
  shipping_address: "Cra 1 # 2-3",
  shipping_city: "Bogotá",
  shipping_postal_code: "110111",
  shipping_country: "Colombia",
  shipping_notes: "Dejar en portería",
  items: [
    {
      id: "item-1",
      product_name: "Campera",
      variant_title: "Talla M",
      quantity: 2,
      unit_price: 24000,
      total_price: 48000,
    },
  ],
};

describe("loadOrderDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeStoreIdMock.mockResolvedValue("store-1");
  });

  it("returns the guest view without querying the order when there is no session", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient(null));

    const view = await loadOrderDetailView("A-9001");

    expect(view).toEqual({ status: "guest" });
    expect(getStoreOrderByNumberForUserMock).not.toHaveBeenCalled();
  });

  // Una tienda sin resolver no puede disfrazarse de "ese pedido no existe".
  it("reports the store as unresolved instead of a missing order when the host has no store", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-1"));
    getRuntimeStoreIdMock.mockResolvedValue(null);

    const view = await loadOrderDetailView("A-9001");

    expect(view).toEqual({ status: "storeUnresolved" });
    expect(getStoreOrderByNumberForUserMock).not.toHaveBeenCalled();
  });

  it("maps an owned order of the current store into the detail view", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-1"));
    getStoreOrderByNumberForUserMock.mockResolvedValue(ORDER_FIXTURE);

    const view = await loadOrderDetailView("A-9001");

    expect(getStoreOrderByNumberForUserMock).toHaveBeenCalledWith(
      "A-9001",
      { storeId: "store-1", userId: "user-1" },
      ECOMMERCE_SCOPED_CLIENT,
    );
    expect(view).toEqual({
      status: "detail",
      order: {
        orderNumber: "A-9001",
        orderDate: "2026-07-01T00:00:00Z",
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: "cash_on_delivery",
        currencyCode: "COP",
        subtotal: 48000,
        shippingCost: 2000,
        // D23: ORDER_FIXTURE predates shipping_status (nullable since S9) --
        // the mapper falls back to null rather than crashing on the missing column.
        shippingStatus: null,
        totalAmount: 50000,
        lines: [
          {
            id: "item-1",
            productName: "Campera",
            variantTitle: "Talla M",
            quantity: 2,
            unitPrice: 24000,
            totalPrice: 48000,
          },
        ],
        shipping: {
          address: "Cra 1 # 2-3",
          city: "Bogotá",
          postalCode: "110111",
          country: "Colombia",
          notes: "Dejar en portería",
        },
      },
    });
  });

  // La consulta ya negó el pedido ajeno; la vista no puede volver a contarlo
  // como "existe pero no es tuyo": sale por la misma puerta que un número
  // inventado para no servir de oráculo.
  it("shows the same not-found view for an order that belongs to somebody else", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("attacker-user"));
    getStoreOrderByNumberForUserMock.mockResolvedValue(null);

    const view = await loadOrderDetailView("A-9001");

    expect(view).toEqual({ status: "notFound" });
  });
});
