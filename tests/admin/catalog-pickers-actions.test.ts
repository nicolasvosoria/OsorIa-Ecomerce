import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, getCategories, getItems } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  getCategories: vi.fn(),
  getItems: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/products-api", () => ({ getCategories, getItems }))

import {
  listActiveStoreCategories,
  listActiveStoreItems,
} from "@/app/admin/actions/catalog-pickers"

const SERVICE = { marker: "service-client" }
const STORE_GRANT = { supabase: SERVICE, storeId: "store-b", userId: "admin-1" }
const STORE_DENIAL = { error: "Acceso denegado", status: 403 as const }

const CATEGORY = { id: "cat-1", category_name: "Bocinas" }
const ITEM = { id: "item-1", item_name: "Bocina X" }

describe("catalog picker readers (active-store gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(STORE_GRANT)
    getCategories.mockResolvedValue([CATEGORY])
    getItems.mockResolvedValue({ items: [ITEM], total: 1, has_more: false })
  })

  it("reads categories scoped to the resolved active store with the service client", async () => {
    await expect(listActiveStoreCategories()).resolves.toEqual([CATEGORY])

    expect(getCategories).toHaveBeenCalledWith(false, "store-b", SERVICE)
  })

  it("reads items scoped to the resolved active store with the service client", async () => {
    await expect(listActiveStoreItems()).resolves.toEqual([ITEM])

    expect(getItems).toHaveBeenCalledWith(
      expect.objectContaining({ store_id: "store-b", is_active: true }),
      SERVICE,
    )
  })

  it("returns no categories when the store gate denies", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue(STORE_DENIAL)

    await expect(listActiveStoreCategories()).rejects.toThrow("Acceso denegado")
    expect(getCategories).not.toHaveBeenCalled()
  })

  it("returns no items when the store gate denies", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue(STORE_DENIAL)

    await expect(listActiveStoreItems()).rejects.toThrow("Acceso denegado")
    expect(getItems).not.toHaveBeenCalled()
  })

  it("takes no store from the caller, so a forged store id cannot widen the scope", async () => {
    const forgeAttempt = listActiveStoreItems as unknown as (storeId: string) => Promise<unknown>

    await forgeAttempt("store-a")

    expect(getItems).toHaveBeenCalledWith(
      expect.objectContaining({ store_id: "store-b" }),
      SERVICE,
    )
  })
})
