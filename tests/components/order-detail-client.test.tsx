import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { OrderDetailClient } from "@/app/orders/[orderNumber]/order-detail-client"
import type { OrderDetailView } from "@/app/orders/[orderNumber]/load-order-detail-view"
import { CheckoutLoginIntentProvider } from "@/contexts/checkout-login-intent-context"
import { LanguageProvider } from "@/contexts/language-context"

function renderOrderDetail(view: OrderDetailView) {
  render(
    <LanguageProvider>
      <CheckoutLoginIntentProvider>
        <OrderDetailClient view={view} />
      </CheckoutLoginIntentProvider>
    </LanguageProvider>,
  )
}

const OWNED_ORDER: OrderDetailView = {
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
}

describe("OrderDetailClient owned order", () => {
  it("titles the page with the order number the customer already knows", () => {
    renderOrderDetail(OWNED_ORDER)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toHaveTextContent("A-9001")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("renders the lines, the totals, the state and the shipping data of the order", () => {
    renderOrderDetail(OWNED_ORDER)

    expect(screen.getByText("Campera")).toBeInTheDocument()
    expect(screen.getByText("Talla M")).toBeInTheDocument()
    expect(screen.getByText(/2 ×/)).toBeInTheDocument()
    expect(screen.getByText("Confirmado")).toBeInTheDocument()
    expect(screen.getByText("Pago: Pagado")).toBeInTheDocument()
    expect(screen.getByText("$ 50.000")).toBeInTheDocument()
    expect(screen.getByText("Cra 1 # 2-3")).toBeInTheDocument()
    expect(screen.getByText(/Pago contra entrega/)).toBeInTheDocument()
  })

  // `CardTitle` pinta un <div>: sin rol de encabezado, las dos secciones del
  // pedido se veían pero no existían para la navegación por encabezados.
  it("exposes each section of the order as a level-2 heading", () => {
    renderOrderDetail(OWNED_ORDER)

    const sections = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
    expect(sections).toEqual(["Artículos", "Información de envío"])
  })

  it("keeps a way back to the single order history", () => {
    renderOrderDetail(OWNED_ORDER)

    expect(screen.getByRole("link", { name: /Volver a mis pedidos/ })).toHaveAttribute(
      "href",
      "/orders",
    )
  })
})

// Un pedido ajeno no se distingue de un número inventado: la pantalla no
// confirma que exista, y desde luego no enseña nada de él.
describe("OrderDetailClient refused order", () => {
  it("shows the not-found notice without leaking any order data", () => {
    renderOrderDetail({ status: "notFound" })

    expect(
      screen.getByRole("heading", { name: "No encontramos ese pedido" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Campera")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Volver a mis pedidos/ })).toHaveAttribute(
      "href",
      "/orders",
    )
  })
})

describe("OrderDetailClient unresolved store", () => {
  it("says the orders could not be opened instead of claiming the order does not exist", () => {
    renderOrderDetail({ status: "storeUnresolved" })

    expect(
      screen.getByRole("heading", { name: "No pudimos abrir tus pedidos" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "No encontramos ese pedido" }),
    ).not.toBeInTheDocument()
  })
})

describe("OrderDetailClient guest", () => {
  it("asks a visitor without a session to sign in", () => {
    renderOrderDetail({ status: "guest" })

    expect(
      screen.getByRole("heading", { name: "Inicia sesión para ver tus pedidos" }),
    ).toBeInTheDocument()
  })
})
