import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
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
vi.mock("next/navigation", () => ({ notFound, redirect }))

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
