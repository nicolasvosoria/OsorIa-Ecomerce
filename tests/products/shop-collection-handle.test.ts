import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ItemCategory } from "@/lib/types/products"

const { getCategoriesMock } = vi.hoisted(() => ({
  getCategoriesMock: vi.fn(),
}))

vi.mock("@/lib/supabase/products-api", () => ({
  getCategories: getCategoriesMock,
  getItems: vi.fn(),
}))

import { getCollection, getCollections } from "@/lib/products"

function makeCategory(overrides: Partial<ItemCategory>): ItemCategory {
  return {
    id: "cat-1",
    category_name: "Auriculares y Audífonos",
    slug: "auriculares-y-audifonos",
    display_order: 1,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  }
}

// /shop's collection handle used to be recomputed live from category_name
// (lowercase + dash-join whitespace), which diverges from item_categories.slug
// whenever the name carries accents or was renamed after the slug was
// persisted. These pin /shop to the stored slug, the same field categories-api
// and popular-sections already resolve by.
describe("shop collection handle resolves the persisted slug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("builds the collection handle and path from the persisted slug, not an accent-sensitive recompute", async () => {
    getCategoriesMock.mockResolvedValue([makeCategory({})])

    const [collection] = await getCollections()

    expect(collection).toMatchObject({
      handle: "auriculares-y-audifonos",
      path: "/shop/auriculares-y-audifonos",
    })
  })

  it("resolves an accented category name at its persisted (accent-stripped) slug", async () => {
    getCategoriesMock.mockResolvedValue([makeCategory({})])

    const collection = await getCollection("auriculares-y-audifonos")

    expect(collection?.title).toBe("Auriculares y Audífonos")
  })

  it("does not resolve a live recompute of the accented category name", async () => {
    getCategoriesMock.mockResolvedValue([makeCategory({})])

    const collection = await getCollection("auriculares-y-audífonos")

    expect(collection).toBeNull()
  })

  it("keeps resolving a renamed category at its stored slug, not one derived from the new name", async () => {
    getCategoriesMock.mockResolvedValue([
      makeCategory({ category_name: "Bocinas Bluetooth", slug: "speakers" }),
    ])

    const collection = await getCollection("speakers")

    expect(collection?.title).toBe("Bocinas Bluetooth")
  })
})
