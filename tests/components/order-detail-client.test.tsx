import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { OrderDetailClient } from "@/app/orders/[orderNumber]/order-detail-client"
import type { OrderDetail, OrderDetailView } from "@/app/orders/[orderNumber]/load-order-detail-view"
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

const OWNED_ORDER_DETAIL: OrderDetail = {
  orderNumber: "A-9001",
  orderDate: "2026-07-01T00:00:00Z",
  status: "confirmed",
  paymentStatus: "paid",
  paymentMethod: "cash_on_delivery",
  currencyCode: "COP",
  subtotal: 48000,
  shippingCost: 2000,
  shippingStatus: "rate",
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
}

const OWNED_ORDER: OrderDetailView = {
  status: "detail",
  order: OWNED_ORDER_DETAIL,
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

// D23: a $0 shipping_cost means something different depending on how it was
// resolved, so the detail page must render the status, not a bare amount --
// and a legacy order with no shipping_status (nullable since S9) has to
// keep rendering the way it always did instead of crashing.
describe("OrderDetailClient shipping status rendering (D23)", () => {
  function orderDetailWithShipping(
    shippingStatus: OrderDetail["shippingStatus"],
    shippingCost: number,
  ): OrderDetailView {
    return {
      status: "detail",
      order: { ...OWNED_ORDER_DETAIL, shippingStatus, shippingCost },
    }
  }

  it("shows the resolved amount for a real zone rate", () => {
    renderOrderDetail(orderDetailWithShipping("rate", 2000))

    expect(screen.getByText("$ 2.000")).toBeInTheDocument()
  })

  it("shows the coordinate phrase for a coordinate-mode order, never a bare zero", () => {
    renderOrderDetail(orderDetailWithShipping("agreed", 0))

    expect(screen.getByText("A convenir con la tienda")).toBeInTheDocument()
  })

  it("shows the same coordinate phrase for a destination outside every zone", () => {
    renderOrderDetail(orderDetailWithShipping("out_of_zone", 0))

    expect(screen.getByText("A convenir con la tienda")).toBeInTheDocument()
  })

  it("shows Gratis for a ladder's free rung, distinct from the coordinate phrase", () => {
    renderOrderDetail(orderDetailWithShipping("free", 0))

    expect(screen.getByText("Gratis")).toBeInTheDocument()
    expect(screen.queryByText("A convenir con la tienda")).not.toBeInTheDocument()
  })

  it("falls back to the amount for a legacy order with no shipping_status", () => {
    renderOrderDetail(orderDetailWithShipping(null, 2000))

    expect(screen.getByText("$ 2.000")).toBeInTheDocument()
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
