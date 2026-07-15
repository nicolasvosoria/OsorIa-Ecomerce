import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeActiveStoreAdmin,
  createCategory,
  updateCategory,
  deactivateCategory,
  deleteCategory,
  revalidatePath,
} = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deactivateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/categories-api", () => ({
  createCategory,
  updateCategory,
  deactivateCategory,
  deleteCategory,
}))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  createCategoryAction,
  deactivateCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/admin/products/categories/actions"
import type { CategoryFormValues } from "@/lib/categories/schemas"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }
const CATEGORIES_PATH = "/admin/products/categories"

const baseInput: CategoryFormValues = {
  category_name: "Speakers",
  slug: "",
  category_description: "Bocinas",
  category_image_url: "https://cdn/speakers.webp",
  display_order: "3",
  is_active: true,
  seo_title: "Bocinas | OsorIA",
  seo_description: "Bocinas con envío gratis.",
}

beforeEach(() => {
  vi.clearAllMocks()
  authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
  createCategory.mockResolvedValue({ success: true })
  updateCategory.mockResolvedValue({ success: true })
  deactivateCategory.mockResolvedValue({ success: true })
  deleteCategory.mockResolvedValue({ success: true })
})

describe("createCategoryAction", () => {
  it("writes to the authorized store with the granted client", async () => {
    await createCategoryAction(baseInput)

    expect(createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ category_name: "Speakers", display_order: 3 }),
      "store-1",
      SERVICE,
    )
  })

  it("leaves the slug out so the api derives it from the name", async () => {
    await createCategoryAction(baseInput)

    expect(createCategory.mock.calls[0][0]).toMatchObject({ slug: undefined })
  })

  it("refreshes the listing after a successful write", async () => {
    await createCategoryAction(baseInput)

    expect(revalidatePath).toHaveBeenCalledWith(CATEGORIES_PATH)
  })

  it("surfaces the api error verbatim so a duplicate stays readable in the form", async () => {
    createCategory.mockResolvedValue({
      success: false,
      error: "Ya existe una categoría con este nombre en la tienda",
    })

    await expect(createCategoryAction(baseInput)).resolves.toEqual({
      success: false,
      error: "Ya existe una categoría con este nombre en la tienda",
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses to write when the caller does not administer the active store", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "No autorizado" })

    await expect(createCategoryAction(baseInput)).resolves.toEqual({
      success: false,
      error: "No autorizado",
    })
    expect(createCategory).not.toHaveBeenCalled()
  })
})

describe("updateCategoryAction", () => {
  it("scopes the update to the authorized store, not to a store from the input", async () => {
    await updateCategoryAction("cat-1", { ...baseInput, slug: "speakers" })

    expect(updateCategory).toHaveBeenCalledWith(
      "cat-1",
      expect.objectContaining({ slug: "speakers" }),
      "store-1",
      SERVICE,
    )
  })

  it("refuses to write when the caller does not administer the active store", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "No autorizado" })

    await expect(updateCategoryAction("cat-1", baseInput)).resolves.toEqual({
      success: false,
      error: "No autorizado",
    })
    expect(updateCategory).not.toHaveBeenCalled()
  })
})

describe("deactivateCategoryAction", () => {
  it("deactivates within the authorized store", async () => {
    await deactivateCategoryAction("cat-1")

    expect(deactivateCategory).toHaveBeenCalledWith("cat-1", "store-1", SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith(CATEGORIES_PATH)
  })

  it("refuses to deactivate when the caller does not administer the active store", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "No autorizado" })

    await expect(deactivateCategoryAction("cat-1")).resolves.toEqual({
      success: false,
      error: "No autorizado",
    })
    expect(deactivateCategory).not.toHaveBeenCalled()
  })
})

describe("deleteCategoryAction", () => {
  it("deletes within the authorized store", async () => {
    await deleteCategoryAction("cat-1")

    expect(deleteCategory).toHaveBeenCalledWith("cat-1", "store-1", SERVICE)
  })

  it("refuses to delete when the caller does not administer the active store", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "No autorizado" })

    await expect(deleteCategoryAction("cat-1")).resolves.toEqual({
      success: false,
      error: "No autorizado",
    })
    expect(deleteCategory).not.toHaveBeenCalled()
  })
})
