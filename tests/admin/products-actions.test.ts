import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeActiveStoreAdmin,
  createItem,
  updateItem,
  getItemById,
  revalidatePath,
} = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  getItemById: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/products-api", () => ({ createItem, updateItem }))
vi.mock("@/lib/supabase/products-read", () => ({ getItemById }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  createProductAction,
  softDeleteProductAction,
  updateProductAction,
} from "@/app/admin/products/actions"
import type { ProductFormValues } from "@/lib/products/schemas"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const baseInput: ProductFormValues = {
  item_name: "  Café Especial  ",
  item_code: "  SKU-1 ",
  item_description: "  Molido premium ",
  ai_details: "  tostado medio ",
  category_id: "cat-1",
  base_price: "12000",
  compare_at_price: "15000",
  currency_code: "COP",
  is_active: true,
  is_featured: false,
  is_available_for_sale: true,
  track_inventory: true,
  inventory_quantity: "7",
  low_stock_threshold: "3",
  seo_title: "  SEO  ",
  seo_description: "  desc  ",
  tags: "café, premium ,",
  display_order: "2",
  images: ["https://cdn/primary.webp", "https://cdn/extra.webp"],
}

describe("product server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    createItem.mockResolvedValue({ success: true, item: { id: "item-1" } })
    updateItem.mockResolvedValue({ success: true, item: { id: "item-1" } })
    getItemById.mockResolvedValue({ id: "item-1", metadata: { existing: "keep" } })
  })

  it("creates a product scoped to the active store with parsed fields and split images", async () => {
    const result = await createProductAction(baseInput)

    expect(result).toEqual({ success: true, error: undefined })
    expect(createItem).toHaveBeenCalledTimes(1)
    const [data, additionalImages, client] = createItem.mock.calls[0]
    expect(client).toBe(SERVICE)
    expect(additionalImages).toEqual(["https://cdn/extra.webp"])
    expect(data).toMatchObject({
      store_id: "store-1",
      item_name: "Café Especial",
      item_code: "SKU-1",
      base_price: 12000,
      compare_at_price: 15000,
      inventory_quantity: 7,
      low_stock_threshold: 3,
      tags: ["café", "premium"],
      primary_image_url: "https://cdn/primary.webp",
      primary_image_alt: "Café Especial",
      metadata: { ai_details: "tostado medio" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products")
  })

  it("drops an invalid compare-at price on create", async () => {
    await createProductAction({ ...baseInput, compare_at_price: "1" })
    expect(createItem.mock.calls[0][0].compare_at_price).toBeUndefined()
  })

  it("refuses to create when authorization is denied", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    const result = await createProductAction(baseInput)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(createItem).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("updates a product store-scoped and merges existing metadata", async () => {
    const result = await updateProductAction("item-1", baseInput)

    expect(result).toEqual({ success: true, error: undefined })
    expect(getItemById).toHaveBeenCalledWith("item-1", "store-1", SERVICE)
    const [id, data, additionalImages, storeId, client] = updateItem.mock.calls[0]
    expect(id).toBe("item-1")
    expect(storeId).toBe("store-1")
    expect(client).toBe(SERVICE)
    expect(additionalImages).toEqual(["https://cdn/extra.webp"])
    expect(data.metadata).toEqual({ existing: "keep", ai_details: "tostado medio" })
    expect(data.primary_image_url).toBe("https://cdn/primary.webp")
  })

  it("removes ai_details from metadata when cleared on update", async () => {
    getItemById.mockResolvedValue({ id: "item-1", metadata: { existing: "keep", ai_details: "old" } })

    await updateProductAction("item-1", { ...baseInput, ai_details: "   " })

    expect(updateItem.mock.calls[0][1].metadata).toEqual({ existing: "keep" })
  })

  it("soft-deletes by archiving within the active store", async () => {
    const result = await softDeleteProductAction("item-1")

    expect(result).toEqual({ success: true, error: undefined })
    expect(updateItem).toHaveBeenCalledWith(
      "item-1",
      { is_active: false },
      [],
      "store-1",
      SERVICE,
    )
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products")
  })

  it("refuses to soft-delete when authorization is denied", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    const result = await softDeleteProductAction("item-1")

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(updateItem).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("surfaces the products-api's own message when the soft-delete fails", async () => {
    updateItem.mockResolvedValue({ success: false, error: "Producto no encontrado" })

    const result = await softDeleteProductAction("item-1")

    expect(result).toEqual({ success: false, error: "Producto no encontrado" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
