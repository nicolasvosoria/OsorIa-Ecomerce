import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { OrdersPageClient } from "@/app/orders/orders-page-client"
import type { OrdersPageView } from "@/app/orders/load-orders-view"
import { CheckoutLoginIntentProvider, useCheckoutLoginIntent } from "@/contexts/checkout-login-intent-context"
import { LanguageProvider } from "@/contexts/language-context"

function CountReadout() {
  const { loginRequestCount } = useCheckoutLoginIntent()
  return <span data-testid="login-request-count">{loginRequestCount}</span>
}

function renderOrdersPage(view: OrdersPageView) {
  render(
    <LanguageProvider>
      <CheckoutLoginIntentProvider>
        <OrdersPageClient view={view} />
        <CountReadout />
      </CheckoutLoginIntentProvider>
    </LanguageProvider>,
  )
}

describe("OrdersPageClient guest state", () => {
  it("shows a login call to action instead of an error or the admin", () => {
    renderOrdersPage({ authenticated: false })

    expect(screen.getByText("Inicia sesión para ver tus pedidos")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Inicia sesión" })).toBeInTheDocument()
  })

  it("requests the login modal through the checkout login intent bridge (D5, reused from D2)", () => {
    renderOrdersPage({ authenticated: false })

    fireEvent.click(screen.getByRole("button", { name: "Inicia sesión" }))

    expect(screen.getByTestId("login-request-count")).toHaveTextContent("1")
  })
})

describe("OrdersPageClient empty state", () => {
  it("shows the empty state when the signed-in customer has no orders", () => {
    renderOrdersPage({ authenticated: true, orders: [] })

    expect(screen.getByText("No hay pedidos")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Explorar productos" })).toHaveAttribute("href", "/shop")
  })
})

describe("OrdersPageClient order list", () => {
  it("renders each order's number, date, total, status, payment status, and item count", () => {
    renderOrdersPage({
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
    })

    expect(screen.getByText("Mis pedidos")).toBeInTheDocument()
    expect(screen.getByText("Número de pedido: A-9001")).toBeInTheDocument()
    expect(screen.getByText("2 artículos", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("Confirmado")).toBeInTheDocument()
    expect(screen.getByText("Pago: Pagado")).toBeInTheDocument()
    expect(screen.getByText("COP 50.000")).toBeInTheDocument()
  })
})
