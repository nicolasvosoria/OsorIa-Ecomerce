import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"

const { getCategoriesMock, getItemsMock, getItemByIdMock, getTopSellingProductIdsMock, getRuntimeStoreIdMock } =
  vi.hoisted(() => ({
    getCategoriesMock: vi.fn(),
    getItemsMock: vi.fn(),
    getItemByIdMock: vi.fn(),
    getTopSellingProductIdsMock: vi.fn(),
    getRuntimeStoreIdMock: vi.fn(),
  }))

vi.mock("@/lib/supabase/products-api", () => ({
  getCategories: getCategoriesMock,
  getItems: getItemsMock,
  getItemById: getItemByIdMock,
}))

vi.mock("@/lib/supabase/stats-api", () => ({
  getTopSellingProductIds: getTopSellingProductIdsMock,
}))

vi.mock("@/lib/utils/store", () => ({
  getRuntimeStoreId: getRuntimeStoreIdMock,
}))

import { getPopularCategoryTiles, getPopularProductCards } from "@/lib/products/popular-sections"

function makeCategory(overrides: Partial<ItemCategory>): ItemCategory {
  return {
    id: "cat-1",
    category_name: "Speakers",
    display_order: 1,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  }
}

function makeItem(overrides: Partial<StoreItemWithDetails>): StoreItemWithDetails {
  return {
    id: "item-1",
    item_name: "SmartSpeak Jessica",
    base_price: 29000,
    currency_code: "COP",
    is_active: true,
    is_featured: false,
    is_available_for_sale: true,
    track_inventory: false,
    inventory_quantity: 0,
    low_stock_threshold: 0,
    display_order: 1,
    view_count: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  }
}

describe("getPopularCategoryTiles", () => {
  beforeEach(() => {
    getCategoriesMock.mockReset()
    getItemsMock.mockReset()
  })

  it("builds one tile per category with name, slug, image, and starting price from the cheapest active item", async () => {
    getCategoriesMock.mockResolvedValue([
      makeCategory({ id: "cat-speakers", category_name: "Bocinas Bluetooth", display_order: 1, category_image_url: "/speakers.webp" }),
      makeCategory({ id: "cat-earphones", category_name: "Auriculares y Audífonos", display_order: 2 }),
    ])
    getItemsMock.mockImplementation(async ({ category_id }: { category_id: string }) => ({
      items: category_id === "cat-speakers"
        ? [makeItem({ base_price: 356000, currency_code: "COP" })]
        : [makeItem({ base_price: 29000, currency_code: "COP" })],
      total: 1,
      has_more: false,
    }))

    const tiles = await getPopularCategoryTiles()

    expect(tiles).toHaveLength(2)
    expect(tiles[0]).toMatchObject({
      id: "cat-speakers",
      name: "Bocinas Bluetooth",
      slug: "bocinas-bluetooth",
      imageUrl: "/speakers.webp",
      href: "/catalog/bocinas-bluetooth",
    })
    expect(tiles[0].startingPriceLabel).toContain("356.000")
    expect(tiles[0].startingPriceAmount).toBe(356000)
    expect(tiles[1]).toMatchObject({
      id: "cat-earphones",
      slug: "auriculares-y-audifonos",
      href: "/catalog/auriculares-y-audifonos",
      startingPriceAmount: 29000,
    })
  })

  it("respects the requested limit and queries the cheapest item per category", async () => {
    getCategoriesMock.mockResolvedValue([
      makeCategory({ id: "cat-1", category_name: "Speakers", display_order: 1 }),
      makeCategory({ id: "cat-2", category_name: "Earphones", display_order: 2 }),
      makeCategory({ id: "cat-3", category_name: "Projectors", display_order: 3 }),
    ])
    getItemsMock.mockResolvedValue({ items: [makeItem({})], total: 1, has_more: false })

    const tiles = await getPopularCategoryTiles(2)

    expect(tiles).toHaveLength(2)
    expect(getItemsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        order_by: "base_price",
        order_direction: "asc",
        limit: 1,
        is_active: true,
        is_available_for_sale: true,
      }),
    )
  })

  it("omits the starting price label when the category has no priced items, without dropping the tile", async () => {
    getCategoriesMock.mockResolvedValue([makeCategory({ id: "cat-empty", category_name: "Stands" })])
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    const tiles = await getPopularCategoryTiles()

    expect(tiles).toHaveLength(1)
    expect(tiles[0].startingPriceLabel).toBe("")
    expect(tiles[0].startingPriceAmount).toBeUndefined()
  })

  it("builds tiles from a curated override, in the given order, ignoring the category list's own order and the limit", async () => {
    getCategoriesMock.mockResolvedValue([
      makeCategory({ id: "cat-speakers", category_name: "Bocinas Bluetooth", display_order: 1, category_image_url: "/speakers.webp" }),
      makeCategory({ id: "cat-earphones", category_name: "Auriculares y Audífonos", display_order: 2, category_image_url: "/earphones.webp" }),
      makeCategory({ id: "cat-projectors", category_name: "Proyectores", display_order: 3 }),
    ])
    getItemsMock.mockResolvedValue({ items: [makeItem({ base_price: 50000 })], total: 1, has_more: false })

    const tiles = await getPopularCategoryTiles(1, [
      { categoryId: "cat-projectors" },
      { categoryId: "cat-speakers" },
    ])

    expect(tiles).toHaveLength(2)
    expect(tiles.map((tile) => tile.id)).toEqual(["cat-projectors", "cat-speakers"])
  })

  it("uses a curated tile's own imageUrl instead of the category's image when both are set", async () => {
    getCategoriesMock.mockResolvedValue([
      makeCategory({ id: "cat-speakers", category_name: "Bocinas Bluetooth", category_image_url: "/speakers.webp" }),
    ])
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    const tiles = await getPopularCategoryTiles(4, [
      { categoryId: "cat-speakers", imageUrl: "/custom-tile.webp" },
    ])

    expect(tiles[0].imageUrl).toBe("/custom-tile.webp")
  })

  it("falls back to the category's own image when a curated tile has no imageUrl", async () => {
    getCategoriesMock.mockResolvedValue([
      makeCategory({ id: "cat-speakers", category_name: "Bocinas Bluetooth", category_image_url: "/speakers.webp" }),
    ])
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    const tiles = await getPopularCategoryTiles(4, [{ categoryId: "cat-speakers" }])

    expect(tiles[0].imageUrl).toBe("/speakers.webp")
  })

  it("drops a curated tile whose categoryId no longer matches any category", async () => {
    getCategoriesMock.mockResolvedValue([makeCategory({ id: "cat-speakers", category_name: "Bocinas Bluetooth" })])
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    const tiles = await getPopularCategoryTiles(4, [
      { categoryId: "cat-deleted" },
      { categoryId: "cat-speakers" },
    ])

    expect(tiles.map((tile) => tile.id)).toEqual(["cat-speakers"])
  })

  it("falls back to today's first-N-categories behavior byte-for-byte when the override is empty", async () => {
    getCategoriesMock.mockResolvedValue([
      makeCategory({ id: "cat-speakers", category_name: "Bocinas Bluetooth", display_order: 1 }),
      makeCategory({ id: "cat-earphones", category_name: "Auriculares y Audífonos", display_order: 2 }),
    ])
    getItemsMock.mockResolvedValue({ items: [makeItem({ base_price: 29000 })], total: 1, has_more: false })

    const withoutOverride = await getPopularCategoryTiles(1)
    const withEmptyOverride = await getPopularCategoryTiles(1, [])

    expect(withEmptyOverride).toEqual(withoutOverride)
    expect(withEmptyOverride.map((tile) => tile.id)).toEqual(["cat-speakers"])
  })
})

describe("getPopularProductCards", () => {
  beforeEach(() => {
    getItemsMock.mockReset()
    getItemByIdMock.mockReset()
    getTopSellingProductIdsMock.mockReset()
    getRuntimeStoreIdMock.mockReset()
  })

  it("fetches active, available products ordered by display_order and adapts them to commerce cards", async () => {
    getItemsMock.mockResolvedValue({
      items: [makeItem({ id: "item-1", item_name: "BePhones XTR4", base_price: 79000, compare_at_price: 99000 })],
      total: 1,
      has_more: false,
    })

    const cards = await getPopularProductCards(8)

    expect(getItemsMock).toHaveBeenCalledWith({
      limit: 8,
      is_active: true,
      is_available_for_sale: true,
      order_by: "display_order",
      order_direction: "asc",
    })
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      id: "item-1",
      title: "BePhones XTR4",
      href: "/products/item-1",
    })
    expect(cards[0].price.hasDiscount).toBe(true)
  })

  it("defaults to a 4-product homepage teaser, matching the reference's 2x2 grid", async () => {
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    await getPopularProductCards()

    expect(getItemsMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 4 }))
  })

  it("still defaults to display_order when the mode is explicitly display_order", async () => {
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    await getPopularProductCards(4, "display_order")

    expect(getItemsMock).toHaveBeenCalledWith({
      limit: 4,
      is_active: true,
      is_available_for_sale: true,
      order_by: "display_order",
      order_direction: "asc",
    })
  })

  it("orders by view_count descending in most_viewed mode", async () => {
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    await getPopularProductCards(4, "most_viewed")

    expect(getItemsMock).toHaveBeenCalledWith({
      limit: 4,
      is_active: true,
      is_available_for_sale: true,
      order_by: "view_count",
      order_direction: "desc",
    })
  })

  it("filters by is_featured in featured mode", async () => {
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    await getPopularProductCards(4, "featured")

    expect(getItemsMock).toHaveBeenCalledWith({
      limit: 4,
      is_active: true,
      is_available_for_sale: true,
      is_featured: true,
      order_by: "display_order",
      order_direction: "asc",
    })
  })

  it("hydrates ranked top-selling ids in best_selling mode, preserving rank order", async () => {
    getRuntimeStoreIdMock.mockResolvedValue("store-1")
    getTopSellingProductIdsMock.mockResolvedValue(["item-2", "item-1"])
    getItemByIdMock.mockImplementation(async (id: string) => {
      if (id === "item-1") return makeItem({ id: "item-1", item_name: "Second best" })
      if (id === "item-2") return makeItem({ id: "item-2", item_name: "Top seller" })
      return null
    })

    const cards = await getPopularProductCards(2, "best_selling")

    expect(getTopSellingProductIdsMock).toHaveBeenCalledWith("store-1", 2)
    expect(cards.map((card) => card.id)).toEqual(["item-2", "item-1"])
    expect(getItemsMock).not.toHaveBeenCalled()
  })

  it("backfills with display_order products when best_selling has fewer results than the limit", async () => {
    getRuntimeStoreIdMock.mockResolvedValue(null)
    getTopSellingProductIdsMock.mockResolvedValue(["item-1"])
    getItemByIdMock.mockResolvedValue(makeItem({ id: "item-1", item_name: "Only sale" }))
    getItemsMock.mockResolvedValue({
      items: [
        makeItem({ id: "item-1", item_name: "Only sale" }),
        makeItem({ id: "item-3", item_name: "Display order pick" }),
        makeItem({ id: "item-4", item_name: "Another pick" }),
      ],
      total: 3,
      has_more: false,
    })

    const cards = await getPopularProductCards(3, "best_selling")

    expect(getItemsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        is_available_for_sale: true,
        order_by: "display_order",
        order_direction: "asc",
      }),
    )
    expect(cards.map((card) => card.id)).toEqual(["item-1", "item-3", "item-4"])
  })

  it("drops null hydration results in best_selling mode without throwing", async () => {
    getRuntimeStoreIdMock.mockResolvedValue(null)
    getTopSellingProductIdsMock.mockResolvedValue(["deleted-item", "item-1"])
    getItemByIdMock.mockImplementation(async (id: string) =>
      id === "item-1" ? makeItem({ id: "item-1", item_name: "Still around" }) : null,
    )
    getItemsMock.mockResolvedValue({ items: [], total: 0, has_more: false })

    const cards = await getPopularProductCards(2, "best_selling")

    expect(cards.map((card) => card.id)).toEqual(["item-1"])
  })
})
