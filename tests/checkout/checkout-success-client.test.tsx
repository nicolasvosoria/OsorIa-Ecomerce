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
    expect(screen.getByText("Precio unitario: COP 25.000")).toBeInTheDocument()
    // La línea del ítem y el total del pedido coinciden en monto (una sola
    // unidad de línea), así que aparecen dos veces en pantalla.
    expect(screen.getAllByText("COP 50.000")).toHaveLength(2)
    expect(screen.getByText("Total")).toBeInTheDocument()
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
