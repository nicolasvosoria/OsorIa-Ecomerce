import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/contexts/cart-context", () => ({
  useCart: () => ({ clearCart: vi.fn() }),
}))

import { CheckoutSuccessClient } from "@/app/checkout/success/checkout-success-client"
import type { SuccessPageOrderSummary } from "@/app/checkout/success/fallback-order"
import { LanguageProvider } from "@/contexts/language-context"

const ORDER_SUMMARY: SuccessPageOrderSummary = {
  items: [
    {
      id: "item-1",
      productName: "Campera",
      quantity: 2,
      unitPrice: 25000,
      totalPrice: 50000,
      currencyCode: "COP",
    },
  ],
  subtotal: 50000,
  shippingCost: 0,
  shippingStatus: "free",
  totalAmount: 50000,
  currencyCode: "COP",
  paymentMethod: "cash_on_delivery",
}

function renderSuccessClient(orderSummary: SuccessPageOrderSummary | null) {
  render(
    <LanguageProvider>
      <CheckoutSuccessClient
        initialOrderNumber="A-1"
        initialCustomerData={null}
        initialOrderSummary={orderSummary}
      />
    </LanguageProvider>,
  )
}

describe("CheckoutSuccessClient order summary", () => {
  it("renders order lines, total, and the payment method label from server-provided order data", () => {
    renderSuccessClient(ORDER_SUMMARY)

    expect(screen.getByText("Resumen del pedido")).toBeInTheDocument()
    expect(screen.getByText("2 × Campera")).toBeInTheDocument()
    expect(screen.getByText("Precio unitario: $ 25.000")).toBeInTheDocument()
    // La línea del ítem, el subtotal y el total del pedido coinciden en monto
    // (envío gratis, una sola línea), así que aparecen tres veces en pantalla.
    expect(screen.getAllByText("$ 50.000")).toHaveLength(3)
    expect(screen.getByText("Total")).toBeInTheDocument()
    // D23: envío gratis se rotula "Gratis", nunca un monto en blanco -- un
    // cero nunca debe significar dos cosas distintas.
    expect(screen.getByText("Gratis")).toBeInTheDocument()
    expect(screen.getByText("Método de pago")).toBeInTheDocument()
    expect(screen.getByText("Pago contra entrega")).toBeInTheDocument()
  })

  it("skips the order summary section when only the localStorage-backed minimal data is available", () => {
    renderSuccessClient(null)

    expect(screen.getByText("A-1")).toBeInTheDocument()
    expect(screen.queryByText("Resumen del pedido")).not.toBeInTheDocument()
    expect(screen.queryByText("Método de pago")).not.toBeInTheDocument()
  })
})

// D23: the very first screen a buyer sees has to use the same shipping
// vocabulary as the order detail and the admin -- and a legacy order with no
// shipping_status (nullable since S9) has to keep rendering the way it
// always did instead of crashing.
describe("CheckoutSuccessClient shipping status rendering (D23)", () => {
  function summaryWithShipping(
    shippingStatus: SuccessPageOrderSummary["shippingStatus"],
    shippingCost: number,
  ): SuccessPageOrderSummary {
    return {
      ...ORDER_SUMMARY,
      shippingCost,
      shippingStatus,
      totalAmount: ORDER_SUMMARY.subtotal + shippingCost,
    }
  }

  it("shows the resolved amount for a real zone rate", () => {
    renderSuccessClient(summaryWithShipping("rate", 2000))

    expect(screen.getByText("$ 2.000")).toBeInTheDocument()
  })

  it("shows the coordinate phrase for a coordinate-mode order, never a bare zero", () => {
    renderSuccessClient(summaryWithShipping("agreed", 0))

    expect(screen.getByText("A convenir con la tienda")).toBeInTheDocument()
  })

  it("shows the same coordinate phrase for a destination outside every zone", () => {
    renderSuccessClient(summaryWithShipping("out_of_zone", 0))

    expect(screen.getByText("A convenir con la tienda")).toBeInTheDocument()
  })

  it("falls back to the amount for a legacy order with no shipping_status", () => {
    renderSuccessClient(summaryWithShipping(null, 2000))

    expect(screen.getByText("$ 2.000")).toBeInTheDocument()
  })
})
