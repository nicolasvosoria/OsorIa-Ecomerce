import { describe, expect, it } from "vitest"
import {
  DEFAULT_SHOP_CONFIG,
  SHOP_FILTER_KEYS,
  resolveShopConfig,
} from "@/lib/shop/shop-config"

describe("DEFAULT_SHOP_CONFIG", () => {
  it("keeps the relevance order as the default sort (null = today's display_order)", () => {
    expect(DEFAULT_SHOP_CONFIG.defaultSort).toBeNull()
  })

  it("shows every /shop filter by default", () => {
    for (const key of SHOP_FILTER_KEYS) {
      expect(DEFAULT_SHOP_CONFIG.filters[key]).toBe(true)
    }
  })
})

describe("resolveShopConfig", () => {
  it("returns the full defaults for null, undefined, a non-object, or an array", () => {
    expect(resolveShopConfig(null)).toEqual(DEFAULT_SHOP_CONFIG)
    expect(resolveShopConfig(undefined)).toEqual(DEFAULT_SHOP_CONFIG)
    expect(resolveShopConfig("not-an-object")).toEqual(DEFAULT_SHOP_CONFIG)
    expect(resolveShopConfig(42)).toEqual(DEFAULT_SHOP_CONFIG)
    expect(resolveShopConfig([])).toEqual(DEFAULT_SHOP_CONFIG)
  })

  it("returns a fresh copy each time, not a shared reference to the defaults", () => {
    const resolved = resolveShopConfig(null)
    resolved.filters.category = false
    expect(DEFAULT_SHOP_CONFIG.filters.category).toBe(true)
    expect(resolveShopConfig(null).filters.category).toBe(true)
  })

  it("keeps a valid stored defaultSort", () => {
    for (const sort of ["price-asc", "price-desc", "newest", "oldest"] as const) {
      expect(resolveShopConfig({ defaultSort: sort }).defaultSort).toBe(sort)
    }
  })

  it("coerces an unknown, empty, or non-string defaultSort to null (relevance)", () => {
    expect(resolveShopConfig({ defaultSort: "best-selling" }).defaultSort).toBeNull()
    expect(resolveShopConfig({ defaultSort: "" }).defaultSort).toBeNull()
    expect(resolveShopConfig({ defaultSort: 3 }).defaultSort).toBeNull()
    expect(resolveShopConfig({ defaultSort: null }).defaultSort).toBeNull()
  })

  it("coerces a missing or non-boolean filter flag to visible (true)", () => {
    const resolved = resolveShopConfig({
      filters: { category: "yes", color: 0, tipo: null },
    })

    expect(resolved.filters.category).toBe(true)
    expect(resolved.filters.color).toBe(true)
    expect(resolved.filters.tipo).toBe(true)
    expect(resolved.filters.price).toBe(true)
  })

  it("preserves a real false filter flag", () => {
    const resolved = resolveShopConfig({ filters: { category: false, price: false } })
    expect(resolved.filters.category).toBe(false)
    expect(resolved.filters.price).toBe(false)
    expect(resolved.filters.color).toBe(true)
  })

  it("drops unknown filter keys and unknown top-level keys", () => {
    const resolved = resolveShopConfig({
      defaultSort: "newest",
      filters: { category: true, bogusFilter: true },
      bogusTopLevel: true,
    })

    expect(Object.keys(resolved)).toEqual(["defaultSort", "filters"])
    expect(Object.keys(resolved.filters)).toEqual([...SHOP_FILTER_KEYS])
    expect("bogusFilter" in resolved.filters).toBe(false)
  })

  it("resolves a non-object filters value to all-visible defaults", () => {
    const resolved = resolveShopConfig({ defaultSort: "oldest", filters: "nope" })
    expect(resolved.defaultSort).toBe("oldest")
    for (const key of SHOP_FILTER_KEYS) {
      expect(resolved.filters[key]).toBe(true)
    }
  })
})
