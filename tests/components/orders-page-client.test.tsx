import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const refreshMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

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

const ORDER_ITEM = {
  orderNumber: "A-9001",
  orderDate: "2026-07-01T00:00:00Z",
  totalAmount: 50000,
  currencyCode: "COP",
  status: "confirmed",
  paymentStatus: "paid",
  itemCount: 2,
} as const

describe("OrdersPageClient guest state", () => {
  it("shows a login call to action instead of an error or the admin", () => {
    renderOrdersPage({ status: "guest" })

    expect(
      screen.getByRole("heading", { name: "Inicia sesión para ver tus pedidos" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Inicia sesión" })).toBeInTheDocument()
  })

  it("requests the login modal through the checkout login intent bridge (D5, reused from D2)", () => {
    renderOrdersPage({ status: "guest" })

    fireEvent.click(screen.getByRole("button", { name: "Inicia sesión" }))

    expect(screen.getByTestId("login-request-count")).toHaveTextContent("1")
  })
})

describe("OrdersPageClient empty state", () => {
  it("shows the empty state when the signed-in customer has no orders in this store", () => {
    renderOrdersPage({ status: "history", orders: [] })

    expect(screen.getByRole("heading", { name: "No hay pedidos" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Explorar productos" })).toHaveAttribute("href", "/shop")
  })
})

// D17: sin tienda resuelta el historial NO se vacía en silencio. La pantalla
// dice que no pudo abrirlos y ofrece reintentar, que es lo contrario de
// afirmar "no tienes pedidos".
describe("OrdersPageClient unresolved store state", () => {
  it("says the orders could not be opened instead of showing an empty history", () => {
    renderOrdersPage({ status: "storeUnresolved" })

    expect(
      screen.getByRole("heading", { name: "No pudimos abrir tus pedidos" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "No hay pedidos" })).not.toBeInTheDocument()
  })

  it("offers a retry that re-runs the request", () => {
    renderOrdersPage({ status: "storeUnresolved" })

    fireEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }))

    expect(refreshMock).toHaveBeenCalled()
  })
})

describe("OrdersPageClient order list", () => {
  it("renders each order's number, date, total, status, payment status, and item count", () => {
    renderOrdersPage({ status: "history", orders: [ORDER_ITEM] })

    expect(screen.getByRole("heading", { name: "Mis pedidos" })).toBeInTheDocument()
    expect(screen.getByText(/Número de pedido/)).toBeInTheDocument()
    expect(screen.getByText("A-9001")).toBeInTheDocument()
    expect(screen.getByText("2 artículos", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("Confirmado")).toBeInTheDocument()
    expect(screen.getByText("Pago: Pagado")).toBeInTheDocument()
    expect(screen.getByText("COP 50.000")).toBeInTheDocument()
  })

  // D20: el detalle tiene URL propia, y el nombre accesible del enlace nombra el
  // pedido porque la lista repite el mismo rótulo en cada fila.
  it("links each row to the addressable detail route of that order", () => {
    renderOrdersPage({ status: "history", orders: [ORDER_ITEM] })

    expect(screen.getByRole("link", { name: /A-9001/ })).toHaveAttribute(
      "href",
      "/orders/A-9001",
    )
  })
})
