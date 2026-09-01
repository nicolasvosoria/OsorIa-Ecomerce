import { describe, expect, it, vi, beforeEach } from "vitest"

const { authorizeActiveStoreAdmin, getItems, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  getItems: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/products-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/products-api")>()
  return { ...actual, getItems }
})
vi.mock("next/navigation", () => ({ redirect, usePathname: () => "/admin/products" }))

import AdminProductsPage from "@/app/admin/products/page"

describe("AdminProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: {},
      storeId: "store-1",
      userId: "user-1",
    })
    getItems.mockResolvedValue({ items: [], total: 0 })
  })

  it("pide los productos de los dos estados, no solo los activos", async () => {
    await AdminProductsPage({ searchParams: Promise.resolve({}) })

    expect(getItems).toHaveBeenCalledTimes(1)
    expect(getItems.mock.calls[0][0]).toMatchObject({ is_active: null })
  })

  it("sigue acotando el listado a la tienda activa", async () => {
    await AdminProductsPage({ searchParams: Promise.resolve({}) })

    expect(getItems.mock.calls[0][0]).toMatchObject({ store_id: "store-1" })
  })
})
