import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AdminPageHeader } from "@/components/admin/page-header"
import type { OrderWithItems } from "@/lib/supabase/orders-api"

const { authorizeActiveStoreAdmin, getOrderById, notFound, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  getOrderById: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/orders-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/orders-api")>()
  return { ...actual, getOrderById }
})
vi.mock("next/navigation", () => ({
  notFound,
  redirect,
  usePathname: () => "/admin/orders/1042",
}))

import AdminOrderDetailPage from "@/app/admin/orders/[id]/page"

const ORDER: OrderWithItems = {
  id: "0c9f9a1e-1c4c-4f0a-9d1f-6a1b2c3d4e5f",
  order_number: "1042",
  order_date: "2026-07-10T12:00:00.000Z",
  status: "confirmed",
  customer_type: "guest",
  customer_email: "cliente@example.com",
  customer_first_name: "Ana",
  customer_last_name: "Perez",
  shipping_address: "Calle 1",
  shipping_city: "Bogota",
  shipping_postal_code: "110111",
  shipping_country: "CO",
  payment_status: "paid",
  subtotal: 10000,
  shipping_cost: 0,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 10000,
  currency_code: "COP",
  created_at: "2026-07-10T12:00:00.000Z",
  updated_at: "2026-07-10T12:00:00.000Z",
  items: [],
}

function findElementOfType(node: ReactNode, type: unknown): ReactElement | null {
  if (!isValidElement(node)) return null
  if (node.type === type) return node

  const children = (node.props as { children?: ReactNode }).children
  for (const child of Children.toArray(children)) {
    const found = findElementOfType(child, type)
    if (found) return found
  }
  return null
}

describe("AdminOrderDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: {},
      storeId: "store-1",
      userId: "user-1",
    })
    getOrderById.mockResolvedValue(ORDER)
  })

  it("wires the order number into the breadcrumb entity label, not the raw order id", async () => {
    const page = await AdminOrderDetailPage({ params: Promise.resolve({ id: ORDER.id }) })

    const header = findElementOfType(page, AdminPageHeader) as ReactElement<
      ComponentProps<typeof AdminPageHeader>
    > | null

    expect(header).not.toBeNull()
    expect(header?.props.entityLabel).toBe(`Pedido ${ORDER.order_number}`)
    expect(header?.props.entityLabel).not.toContain(ORDER.id)
  })
})

// D23/A15: the admin is STORE-facing, so unlike the buyer-facing success
// page and order detail it does NOT collapse out_of_zone onto agreed's own
// phrase -- to the owner a coverage gap in their own zones is a different
// fact from their coordinate-shipping policy working as intended. A legacy
// order with no shipping_status (nullable since S9) has to keep rendering
// the way it always did instead of crashing.
describe("AdminOrderDetailPage shipping status rendering (D23/A15)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: {},
      storeId: "store-1",
      userId: "user-1",
    })
  })

  async function renderOrderDetailPage(
    shippingStatus: OrderWithItems["shipping_status"],
    shippingCost: number,
  ) {
    getOrderById.mockResolvedValue({ ...ORDER, shipping_status: shippingStatus, shipping_cost: shippingCost })
    const page = await AdminOrderDetailPage({ params: Promise.resolve({ id: ORDER.id }) })
    render(page)
  }

  it("shows the resolved amount for a real zone rate", async () => {
    await renderOrderDetailPage("rate", 2000)

    expect(screen.getByText("$ 2.000")).toBeInTheDocument()
  })

  it("shows the coordinate phrase for a coordinate-mode order, never a bare zero", async () => {
    await renderOrderDetailPage("agreed", 0)

    expect(screen.getByText("A convenir con la tienda")).toBeInTheDocument()
  })

  it("shows its OWN coverage-gap phrase for a destination outside every zone, distinct from agreed's", async () => {
    await renderOrderDetailPage("out_of_zone", 0)

    expect(screen.getByText("Fuera de zona configurada")).toBeInTheDocument()
    expect(screen.queryByText("A convenir con la tienda")).not.toBeInTheDocument()
  })

  it("shows Gratis for a ladder's free rung, distinct from the coordinate phrase", async () => {
    await renderOrderDetailPage("free", 0)

    expect(screen.getByText("Gratis")).toBeInTheDocument()
    expect(screen.queryByText("A convenir con la tienda")).not.toBeInTheDocument()
  })

  it("falls back to the amount for a legacy order with no shipping_status", async () => {
    await renderOrderDetailPage(null, 2000)

    expect(screen.getByText("$ 2.000")).toBeInTheDocument()
  })
})
