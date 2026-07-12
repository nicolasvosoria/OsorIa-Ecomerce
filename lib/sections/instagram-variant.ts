import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const INSTAGRAM_COLUMNS_OPTIONS = [
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "6", label: "6" },
] as const

export type InstagramColumns = (typeof INSTAGRAM_COLUMNS_OPTIONS)[number]["value"]

const INSTAGRAM_COLUMNS_VALUES = INSTAGRAM_COLUMNS_OPTIONS.map((option) => option.value)

const DEFAULT_INSTAGRAM_COLUMNS: InstagramColumns = "4"

export function resolveInstagramColumns(value: unknown): InstagramColumns {
  return resolveEnumValue(value, INSTAGRAM_COLUMNS_VALUES, DEFAULT_INSTAGRAM_COLUMNS)
}

// Mirrors `LOGOS_COLUMNS_CLASS`: mobile never drops below a 2-up grid — a
// single-column Instagram feed reads as broken on narrow screens. Uses `md:`
// (not `lg:`) for the selected count — see the preview-width rationale on
// `WHYUS_COLUMNS_CLASS` in `whyus-variant.ts`.
export const INSTAGRAM_COLUMNS_CLASS: Record<InstagramColumns, string> = {
  "3": "grid-cols-3",
  "4": "grid-cols-2 md:grid-cols-4",
  "6": "grid-cols-3 md:grid-cols-6",
}

export const INSTAGRAM_GAP_OPTIONS = [
  { value: "none", label: "Sin espacio" },
  { value: "sm", label: "Chico" },
  { value: "md", label: "Mediano" },
] as const

export type InstagramGap = (typeof INSTAGRAM_GAP_OPTIONS)[number]["value"]

const INSTAGRAM_GAP_VALUES = INSTAGRAM_GAP_OPTIONS.map((option) => option.value)

const DEFAULT_INSTAGRAM_GAP: InstagramGap = "sm"

export function resolveInstagramGap(value: unknown): InstagramGap {
  return resolveEnumValue(value, INSTAGRAM_GAP_VALUES, DEFAULT_INSTAGRAM_GAP)
}

export const INSTAGRAM_GAP_CLASS: Record<InstagramGap, string> = {
  none: "gap-0",
  sm: "gap-2 md:gap-3",
  md: "gap-4 md:gap-6",
}
