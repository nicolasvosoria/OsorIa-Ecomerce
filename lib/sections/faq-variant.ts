import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const FAQ_COLUMNS_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
] as const

export type FaqColumns = (typeof FAQ_COLUMNS_OPTIONS)[number]["value"]

const FAQ_COLUMNS_VALUES = FAQ_COLUMNS_OPTIONS.map((option) => option.value)

const DEFAULT_FAQ_COLUMNS: FaqColumns = "1"

export function resolveFaqColumns(value: unknown): FaqColumns {
  return resolveEnumValue(value, FAQ_COLUMNS_VALUES, DEFAULT_FAQ_COLUMNS)
}

export const FAQ_COLUMNS_CLASS: Record<FaqColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
}

export const FAQ_ITEM_STYLE_OPTIONS = [
  { value: "divided", label: "Lista con divisores" },
  { value: "card", label: "Tarjetas con borde" },
] as const

export type FaqItemStyle = (typeof FAQ_ITEM_STYLE_OPTIONS)[number]["value"]

const FAQ_ITEM_STYLE_VALUES = FAQ_ITEM_STYLE_OPTIONS.map((option) => option.value)

const DEFAULT_FAQ_ITEM_STYLE: FaqItemStyle = "divided"

export function resolveFaqItemStyle(value: unknown): FaqItemStyle {
  return resolveEnumValue(value, FAQ_ITEM_STYLE_VALUES, DEFAULT_FAQ_ITEM_STYLE)
}

// "divided" separates items with a single bottom border and no per-item
// background (a plain FAQ list); "card" wraps each item in its own bordered,
// rounded box, mirroring `TESTIMONIALS_CARD_STYLE_CLASS`'s "card" variant.
export const FAQ_ITEM_STYLE_CLASS: Record<FaqItemStyle, string> = {
  divided: "border-b last:border-b-0",
  card: "rounded-card border shadow-[var(--shadow-card,none)] px-4 md:px-6",
}
