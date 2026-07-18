import { beforeEach, describe, expect, it, vi } from "vitest"

import { getItems } from "@/lib/supabase/products-api"
import { comboItemsMatching } from "@/lib/supabase/store-items-query"
import type { ComboCatalogDetails } from "@/lib/combos/types"

const { getSupabaseEcommerceMock } = vi.hoisted(() => ({
  getSupabaseEcommerceMock: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: getSupabaseEcommerceMock,
}))

type RecordedFilter = { op: string; column: string; value: unknown }

class StoreItemsQuery {
  constructor(
    private readonly recorded: RecordedFilter[],
    private readonly response: { data: unknown; error: unknown; count: number },
  ) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.recorded.push({ op: "eq", column, value })
    return this
  }

  gte(column: string, value: unknown) {
    this.recorded.push({ op: "gte", column, value })
    return this
  }

  lte(column: string, value: unknown) {
    this.recorded.push({ op: "lte", column, value })
    return this
  }

  order() {
    return this
  }

  range() {
    return this
  }

  then(onfulfilled: (value: unknown) => unknown) {
    return Promise.resolve(this.response).then(onfulfilled)
  }
}

function mockStoreItemsClient(): RecordedFilter[] {
  const recorded: RecordedFilter[] = []
  getSupabaseEcommerceMock.mockReturnValue({
    from: () => new StoreItemsQuery(recorded, { data: [], error: null, count: 0 }),
  })
  return recorded
}

function comboFixture(name: string, finalUnitPrice: number, componentSubtotal: number): ComboCatalogDetails {
  return {
    id: `combo-${name}`,
    name,
    description: "Combo de prueba",
    slug: `combo-${name.toLowerCase()}`,
    isActive: true,
    pricing: {
      finalUnitPrice,
      componentSubtotal,
      currencyCode: "COP",
      discountType: "percentage",
      discountValue: 10,
    },
    availability: { isAvailable: true, derivedStock: 5 },
  } as unknown as ComboCatalogDetails
}

describe("shop server filters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("filters products by is_on_sale and base_price range in a single query", async () => {
    const recorded = mockStoreItemsClient()

    await getItems({
      store_id: "store-1",
      item_kind: "products",
      on_sale: true,
      price_min: 10000,
      price_max: 50000,
    })

    expect(recorded).toEqual(
      expect.arrayContaining([
        { op: "eq", column: "is_on_sale", value: true },
        { op: "gte", column: "base_price", value: 10000 },
        { op: "lte", column: "base_price", value: 50000 },
      ]),
    )
  })

  it("omits the on_sale and price filters when they are not requested", async () => {
    const recorded = mockStoreItemsClient()

    await getItems({ store_id: "store-1", item_kind: "products" })

    const columns = recorded.map((filter) => filter.column)
    expect(columns).not.toContain("is_on_sale")
    expect(columns).not.toContain("base_price")
  })

  it("keeps only discounted combos when on_sale is requested", () => {
    const discounted = comboFixture("Discounted", 40000, 50000)
    const fullPrice = comboFixture("FullPrice", 40000, 40000)

    const items = comboItemsMatching([discounted, fullPrice], { onSale: true })

    expect(items.map((item) => item.item_name)).toEqual(["Discounted"])
  })

  it("keeps only combos whose price falls inside the range", () => {
    const cheap = comboFixture("Cheap", 15000, 15000)
    const inRange = comboFixture("InRange", 30000, 30000)
    const expensive = comboFixture("Expensive", 90000, 90000)

    const items = comboItemsMatching([cheap, inRange, expensive], { priceMin: 20000, priceMax: 50000 })

    expect(items.map((item) => item.item_name)).toEqual(["InRange"])
  })
})
