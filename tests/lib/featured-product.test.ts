import { describe, expect, it, vi } from "vitest"
import type { StoreItemWithDetails } from "@/lib/types/products"

const getItemsByCategoryMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/products-read", () => ({
  getItemsByCategory: getItemsByCategoryMock,
}))

import { resolveFeaturedProductId } from "@/lib/products/featured-product"

function makeItem(overrides: Partial<StoreItemWithDetails>): StoreItemWithDetails {
  return { id: "item-1", is_featured: false, display_order: 0, ...overrides } as StoreItemWithDetails
}

describe("resolveFeaturedProductId", () => {
  it("returns the category's featured product id when one is marked featured", async () => {
    getItemsByCategoryMock.mockResolvedValue([
      makeItem({ id: "item-1", is_featured: false }),
      makeItem({ id: "item-2", is_featured: true }),
    ])

    const productId = await resolveFeaturedProductId("category-1")

    expect(productId).toBe("item-2")
  });

  it("falls back to the first product by display order when none is featured", async () => {
    getItemsByCategoryMock.mockResolvedValue([
      makeItem({ id: "item-1", is_featured: false, display_order: 1 }),
      makeItem({ id: "item-2", is_featured: false, display_order: 2 }),
    ])

    const productId = await resolveFeaturedProductId("category-1")

    expect(productId).toBe("item-1")
  });

  it("returns null when the category has no products", async () => {
    getItemsByCategoryMock.mockResolvedValue([])

    const productId = await resolveFeaturedProductId("category-1")

    expect(productId).toBeNull()
  });

  it("returns the override product id without querying the category when provided", async () => {
    getItemsByCategoryMock.mockClear()

    const productId = await resolveFeaturedProductId("category-1", "override-item")

    expect(productId).toBe("override-item")
    expect(getItemsByCategoryMock).not.toHaveBeenCalled()
  });
})
