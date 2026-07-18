import { describe, expect, it } from "vitest"

import { resolveShopServerFilters } from "@/app/shop/components/product-list"
import { DEFAULT_SHOP_CONFIG } from "@/lib/shop/shop-config"

function configWith(overrides: Partial<typeof DEFAULT_SHOP_CONFIG.filters> = {}, defaultSort: typeof DEFAULT_SHOP_CONFIG.defaultSort = null) {
  return {
    defaultSort,
    filters: { ...DEFAULT_SHOP_CONFIG.filters, ...overrides },
  }
}

describe("resolveShopServerFilters (D20 + filter visibility)", () => {
  it("matches today's shop exactly with no config row and no URL params", () => {
    const filters = resolveShopServerFilters("", {}, DEFAULT_SHOP_CONFIG)

    expect(filters).toEqual({
      collection: "",
      sort: undefined,
      search: undefined,
      onSale: false,
      priceMin: undefined,
      priceMax: undefined,
    })
  })

  it("falls back to the configured defaultSort when the URL has no ?sort", () => {
    const filters = resolveShopServerFilters("", {}, configWith({}, "price-asc"))

    expect(filters.sort).toBe("price-asc")
  })

  it("lets the URL's ?sort win over the configured defaultSort", () => {
    const filters = resolveShopServerFilters("", { sort: "oldest" }, configWith({}, "price-asc"))

    expect(filters.sort).toBe("oldest")
  })

  it("ignores the URL's ?sort and always falls back to defaultSort when filters.sort is hidden", () => {
    const filters = resolveShopServerFilters(
      "",
      { sort: "oldest" },
      configWith({ sort: false }, "price-asc"),
    )

    expect(filters.sort).toBe("price-asc")
  })

  it("resolves to relevance (undefined) when defaultSort is null, even with the sort control hidden", () => {
    const filters = resolveShopServerFilters("", { sort: "oldest" }, configWith({ sort: false }, null))

    expect(filters.sort).toBeUndefined()
  })

  it("drops ?oferta when filters.enOferta is hidden", () => {
    const filters = resolveShopServerFilters("", { oferta: "1" }, configWith({ enOferta: false }))

    expect(filters.onSale).toBe(false)
  })

  it("keeps ?oferta when filters.enOferta stays visible", () => {
    const filters = resolveShopServerFilters("", { oferta: "1" }, DEFAULT_SHOP_CONFIG)

    expect(filters.onSale).toBe(true)
  })

  it("drops ?price_min/?price_max when filters.price is hidden", () => {
    const filters = resolveShopServerFilters(
      "",
      { price_min: "1000", price_max: "5000" },
      configWith({ price: false }),
    )

    expect(filters.priceMin).toBeUndefined()
    expect(filters.priceMax).toBeUndefined()
  })

  it("keeps ?price_min/?price_max when filters.price stays visible", () => {
    const filters = resolveShopServerFilters(
      "",
      { price_min: "1000", price_max: "5000" },
      DEFAULT_SHOP_CONFIG,
    )

    expect(filters.priceMin).toBe(1000)
    expect(filters.priceMax).toBe(5000)
  })
})
