import { describe, expect, it } from "vitest";

import { generateInvoiceEmailHTML } from "@/lib/orders/order-confirmation-email";
import { PAYMENT_METHODS } from "@/lib/checkout/payment-methods";
import type { OrderWithItems } from "@/lib/supabase/orders-api";

// D3/D-constraint (slice 7): el correo de confirmación no puede decir "GRATIS"
// (el envío no es gratis, lo confirma la tienda) ni traer residuo de una oficina
// en Singapore copiada de una plantilla, y el label del método de pago debe salir
// del registro único (lib/checkout/payment-methods.ts), no de un mapa propio.
function buildOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: "order-1",
    order_number: "A-1001",
    order_date: "2026-07-01T00:00:00.000Z",
    status: "confirmed",
    customer_type: "guest",
    customer_email: "cliente@example.com",
    customer_first_name: "Ana",
    customer_last_name: "Gómez",
    shipping_address: "Calle 10 # 20-30",
    shipping_city: "Bogotá",
    shipping_postal_code: "110111",
    shipping_country: "Colombia",
    payment_method: "cash_on_delivery",
    payment_status: "pending",
    subtotal: 50000,
    shipping_cost: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 50000,
    currency_code: "COP",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        order_id: "order-1",
        product_name: "Campera",
        unit_price: 50000,
        quantity: 1,
        total_price: 50000,
        currency_code: "COP",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("generateInvoiceEmailHTML", () => {
  it("renders the registry label and the honest shipping line for a cash_on_delivery order", () => {
    const cashOnDeliveryLabel = PAYMENT_METHODS.find(
      (method) => method.id === "cash_on_delivery",
    )?.label;

    const html = generateInvoiceEmailHTML(buildOrder());

    expect(cashOnDeliveryLabel).toBeTruthy();
    expect(html).toContain(cashOnDeliveryLabel as string);
    expect(html).toContain(
      "El costo de envío lo confirma la tienda al coordinar la entrega",
    );
    expect(html).not.toContain("GRATIS");
  });

  it("shows the real shipping cost instead of the honest fallback when it is set", () => {
    const html = generateInvoiceEmailHTML(
      buildOrder({ shipping_cost: 12000 }),
    );

    expect(html).not.toContain(
      "El costo de envío lo confirma la tienda al coordinar la entrega",
    );
    expect(html).not.toContain("GRATIS");
  });

  it("never mentions the copied-template Singapore office address", () => {
    const html = generateInvoiceEmailHTML(buildOrder());

    expect(html).not.toContain("Singapore");
  });

  it("uses a single, consistent delivery estimate throughout the email", () => {
    const html = generateInvoiceEmailHTML(buildOrder());

    expect(html).not.toContain("7 - 8 días hábiles");
    expect(html.match(/7-18 días hábiles/g)).toHaveLength(2);
  });

  it("falls back to the raw payment method value for a legacy/unknown method", () => {
    const html = generateInvoiceEmailHTML(
      buildOrder({ payment_method: "legacy_wire_transfer" }),
    );

    expect(html).toContain("legacy_wire_transfer");
  });
});
