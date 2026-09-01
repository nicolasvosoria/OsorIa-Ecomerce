import { describe, expect, it, vi, beforeEach } from "vitest"

const { authorizeActiveStoreAdmin, getOrders, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  getOrders: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/orders-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/orders-api")>()
  return { ...actual, getOrders }
})
vi.mock("next/navigation", () => ({ redirect, usePathname: () => "/admin/orders" }))

import AdminOrdersPage from "@/app/admin/orders/page"

const AUTHORIZED_CLIENT = { tag: "service-client" }

describe("AdminOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: AUTHORIZED_CLIENT,
      storeId: "store-1",
      userId: "user-1",
    })
    getOrders.mockResolvedValue({ orders: [], total: 0 })
  })

  it("consulta los pedidos con el cliente autorizado, no con el cliente anónimo", async () => {
    await AdminOrdersPage({ searchParams: Promise.resolve({}) })

    expect(getOrders).toHaveBeenCalledTimes(1)
    expect(getOrders.mock.calls[0][1]).toBe(AUTHORIZED_CLIENT)
  })

  it("acota la consulta a la tienda activa", async () => {
    await AdminOrdersPage({ searchParams: Promise.resolve({}) })

    expect(getOrders.mock.calls[0][0]).toMatchObject({ storeId: "store-1" })
  })
})
