import { beforeEach, describe, expect, it, vi } from "vitest"

const { getShopProductsPage } = vi.hoisted(() => ({ getShopProductsPage: vi.fn() }))

vi.mock("@/lib/products", () => ({ getShopProductsPage }))

import { loadMoreShopProducts } from "@/app/shop/actions/load-more"
import type { ShopServerFilters } from "@/lib/commerce/types"

const FILTERS: ShopServerFilters = {
  collection: "ofertas",
  sort: "price-asc",
  search: "café",
  onSale: true,
  priceMin: 1000,
  priceMax: 5000,
}

const NEXT_PAGE = { products: [{ id: "p-21" }, { id: "p-22" }], total: 42, hasMore: true }

describe("loadMoreShopProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getShopProductsPage.mockResolvedValue(NEXT_PAGE)
  })

  it("fetches the next page with the current server filters and the given offset", async () => {
    await expect(loadMoreShopProducts({ ...FILTERS, offset: 40 })).resolves.toEqual(NEXT_PAGE)

    expect(getShopProductsPage).toHaveBeenCalledWith(FILTERS, 40)
  })

  it("keeps the offset out of the filter payload passed downstream", async () => {
    await loadMoreShopProducts({ ...FILTERS, offset: 60 })

    const [filtersArg] = getShopProductsPage.mock.calls[0]
    expect(filtersArg).not.toHaveProperty("offset")
  })
})
