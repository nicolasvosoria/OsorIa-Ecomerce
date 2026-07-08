import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const PRODUCTS_CARD_STYLE_OPTIONS = [
  { value: "shadow", label: "Sombra" },
  { value: "bordered", label: "Con borde" },
  { value: "flat", label: "Plano" },
] as const

export type ProductsCardStyle = (typeof PRODUCTS_CARD_STYLE_OPTIONS)[number]["value"]

const PRODUCTS_CARD_STYLE_VALUES = PRODUCTS_CARD_STYLE_OPTIONS.map((option) => option.value)

const DEFAULT_PRODUCTS_CARD_STYLE: ProductsCardStyle = "shadow"

export function resolveCardStyle(value: unknown): ProductsCardStyle {
  return resolveEnumValue(value, PRODUCTS_CARD_STYLE_VALUES, DEFAULT_PRODUCTS_CARD_STYLE)
}

export const PRODUCTS_HOVER_EFFECT_OPTIONS = [
  { value: "lift", label: "Elevar" },
  { value: "zoom", label: "Zoom" },
  { value: "none", label: "Ninguno" },
] as const

export type ProductsHoverEffect = (typeof PRODUCTS_HOVER_EFFECT_OPTIONS)[number]["value"]

const PRODUCTS_HOVER_EFFECT_VALUES = PRODUCTS_HOVER_EFFECT_OPTIONS.map((option) => option.value)

const DEFAULT_PRODUCTS_HOVER_EFFECT: ProductsHoverEffect = "lift"

export function resolveHoverEffect(value: unknown): ProductsHoverEffect {
  return resolveEnumValue(value, PRODUCTS_HOVER_EFFECT_VALUES, DEFAULT_PRODUCTS_HOVER_EFFECT)
}

export const PRODUCTS_COLUMNS_OPTIONS = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
] as const

export type ProductsColumns = (typeof PRODUCTS_COLUMNS_OPTIONS)[number]["value"]

const PRODUCTS_COLUMNS_VALUES = PRODUCTS_COLUMNS_OPTIONS.map((option) => option.value)

const DEFAULT_PRODUCTS_COLUMNS: ProductsColumns = "4"

export function resolveProductsColumns(value: unknown): ProductsColumns {
  return resolveEnumValue(value, PRODUCTS_COLUMNS_VALUES, DEFAULT_PRODUCTS_COLUMNS)
}

// Same values and `md:`-vs-`lg:` preview-width rationale as
// `POPULAR_COLUMNS_CLASS` in `lib/sections/popular-variant.ts`.
export const PRODUCTS_COLUMNS_CLASS: Record<ProductsColumns, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 md:grid-cols-3",
  "4": "sm:grid-cols-2 md:grid-cols-4",
}

const PRODUCTS_ITEM_COUNT_OPTIONS = [4, 6, 8, 12] as const

export type ProductsItemCount = (typeof PRODUCTS_ITEM_COUNT_OPTIONS)[number]

const DEFAULT_PRODUCTS_ITEM_COUNT: ProductsItemCount = 4

// Stored as a select value (string) alongside every other content field, so
// this coerces to number and falls back the same way an invalid enum string
// would above. Shared by the live wrapper's server fetch and the editor
// preview fetch, keeping both on one source of truth for the fallback.
export function resolveItemCount(value: unknown): ProductsItemCount {
  const parsed = Number(value)
  return (PRODUCTS_ITEM_COUNT_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as ProductsItemCount)
    : DEFAULT_PRODUCTS_ITEM_COUNT
}
