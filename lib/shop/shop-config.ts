import { sortOptions } from "@/lib/commerce/constants"

export type ShopSort = "price-asc" | "price-desc" | "newest" | "oldest"

// The /shop filter controls a store can show or hide. `tipo` and `enOferta`
// are the storefront's product-type and on-sale toggles.
export const SHOP_FILTER_KEYS = [
  "category",
  "color",
  "tipo",
  "sort",
  "price",
  "enOferta",
] as const

export type ShopFilterKey = (typeof SHOP_FILTER_KEYS)[number]

export type ShopFilterVisibility = Record<ShopFilterKey, boolean>

export type ShopConfig = {
  // null = the relevance order (today's `display_order asc`), which is not a
  // selectable sort — an absent or invalid stored sort resolves here so the
  // shop keeps its current default (D20).
  defaultSort: ShopSort | null
  filters: ShopFilterVisibility
}

const VALID_SORTS: readonly string[] = sortOptions.map((option) => option.value)

function allFiltersVisible(): ShopFilterVisibility {
  return SHOP_FILTER_KEYS.reduce((filters, key) => {
    filters[key] = true
    return filters
  }, {} as ShopFilterVisibility)
}

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  defaultSort: null,
  filters: allFiltersVisible(),
}

// Validates a stored `shop_config.config` value into a typed ShopConfig:
// null/non-object resolves to the full defaults (today's /shop), unknown keys
// are dropped, each filter flag is coerced to a boolean (missing → visible),
// and defaultSort is validated against the selectable sorts (else null).
export function resolveShopConfig(stored: unknown): ShopConfig {
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
    return { defaultSort: null, filters: allFiltersVisible() }
  }

  const saved = stored as Record<string, unknown>
  return {
    defaultSort: resolveDefaultSort(saved.defaultSort),
    filters: resolveFilterVisibility(saved.filters),
  }
}

function resolveDefaultSort(stored: unknown): ShopSort | null {
  return typeof stored === "string" && VALID_SORTS.includes(stored)
    ? (stored as ShopSort)
    : null
}

function resolveFilterVisibility(stored: unknown): ShopFilterVisibility {
  const saved =
    typeof stored === "object" && stored !== null && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {}

  return SHOP_FILTER_KEYS.reduce((filters, key) => {
    filters[key] = typeof saved[key] === "boolean" ? (saved[key] as boolean) : true
    return filters
  }, {} as ShopFilterVisibility)
}
