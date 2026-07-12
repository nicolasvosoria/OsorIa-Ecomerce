import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const LOGOS_COLUMNS_OPTIONS = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
] as const

export type LogosColumns = (typeof LOGOS_COLUMNS_OPTIONS)[number]["value"]

const LOGOS_COLUMNS_VALUES = LOGOS_COLUMNS_OPTIONS.map((option) => option.value)

const DEFAULT_LOGOS_COLUMNS: LogosColumns = "5"

export function resolveLogosColumns(value: unknown): LogosColumns {
  return resolveEnumValue(value, LOGOS_COLUMNS_VALUES, DEFAULT_LOGOS_COLUMNS)
}

// Mobile always keeps 2-up (never 1) — a single-file logo strip reads as
// broken on narrow screens. Uses `md:` (not `lg:`) for the selected count —
// see the preview-width rationale on `WHYUS_COLUMNS_CLASS` in `whyus-variant.ts`.
export const LOGOS_COLUMNS_CLASS: Record<LogosColumns, string> = {
  "2": "grid-cols-2",
  "3": "grid-cols-2 md:grid-cols-3",
  "4": "grid-cols-2 md:grid-cols-4",
  "5": "grid-cols-2 md:grid-cols-5",
  "6": "grid-cols-2 md:grid-cols-6",
}

export const LOGOS_SIZE_OPTIONS = [
  { value: "sm", label: "Pequeño" },
  { value: "md", label: "Mediano" },
  { value: "lg", label: "Grande" },
] as const

export type LogosSize = (typeof LOGOS_SIZE_OPTIONS)[number]["value"]

const LOGOS_SIZE_VALUES = LOGOS_SIZE_OPTIONS.map((option) => option.value)

const DEFAULT_LOGOS_SIZE: LogosSize = "md"

export function resolveLogosSize(value: unknown): LogosSize {
  return resolveEnumValue(value, LOGOS_SIZE_VALUES, DEFAULT_LOGOS_SIZE)
}

export const LOGOS_SIZE_CLASS: Record<LogosSize, string> = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-14 w-auto",
}

export const LOGOS_ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
] as const

export type LogosAlign = (typeof LOGOS_ALIGN_OPTIONS)[number]["value"]

const LOGOS_ALIGN_VALUES = LOGOS_ALIGN_OPTIONS.map((option) => option.value)

const DEFAULT_LOGOS_ALIGN: LogosAlign = "center"

export function resolveLogosAlign(value: unknown): LogosAlign {
  return resolveEnumValue(value, LOGOS_ALIGN_VALUES, DEFAULT_LOGOS_ALIGN)
}

export const LOGOS_ALIGN_CLASS: Record<LogosAlign, string> = {
  left: "justify-items-start",
  center: "justify-items-center",
}

// Applied to each logo image when the grayscale toggle (resolved via
// `isToggleOn` from `lib/section-editor/toggle-value.ts`) is on — logos
// regain full color on hover, a common brand-strip affordance.
export const LOGOS_GRAYSCALE_CLASS = "grayscale transition-[filter] hover:grayscale-0"
