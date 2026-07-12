import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const TESTIMONIALS_COLUMNS_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
] as const

export type TestimonialsColumns = (typeof TESTIMONIALS_COLUMNS_OPTIONS)[number]["value"]

const TESTIMONIALS_COLUMNS_VALUES = TESTIMONIALS_COLUMNS_OPTIONS.map((option) => option.value)

const DEFAULT_TESTIMONIALS_COLUMNS: TestimonialsColumns = "3"

export function resolveTestimonialsColumns(value: unknown): TestimonialsColumns {
  return resolveEnumValue(value, TESTIMONIALS_COLUMNS_VALUES, DEFAULT_TESTIMONIALS_COLUMNS)
}

export const TESTIMONIALS_COLUMNS_CLASS: Record<TestimonialsColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 md:grid-cols-3",
}

export const TESTIMONIALS_CARD_STYLE_OPTIONS = [
  { value: "card", label: "Tarjeta con borde" },
  { value: "quote", label: "Cita simple" },
] as const

export type TestimonialsCardStyle = (typeof TESTIMONIALS_CARD_STYLE_OPTIONS)[number]["value"]

const TESTIMONIALS_CARD_STYLE_VALUES = TESTIMONIALS_CARD_STYLE_OPTIONS.map((option) => option.value)

const DEFAULT_TESTIMONIALS_CARD_STYLE: TestimonialsCardStyle = "card"

export function resolveTestimonialsCardStyle(value: unknown): TestimonialsCardStyle {
  return resolveEnumValue(value, TESTIMONIALS_CARD_STYLE_VALUES, DEFAULT_TESTIMONIALS_CARD_STYLE)
}

export const TESTIMONIALS_CARD_STYLE_CLASS: Record<TestimonialsCardStyle, string> = {
  card: "rounded-card border border-[var(--border)] p-6 shadow-[var(--shadow-card,none)] md:p-8",
  quote: "p-2",
}

export const TESTIMONIALS_CONTENT_ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
] as const

export type TestimonialsContentAlign = (typeof TESTIMONIALS_CONTENT_ALIGN_OPTIONS)[number]["value"]

const TESTIMONIALS_CONTENT_ALIGN_VALUES = TESTIMONIALS_CONTENT_ALIGN_OPTIONS.map((option) => option.value)

const DEFAULT_TESTIMONIALS_CONTENT_ALIGN: TestimonialsContentAlign = "left"

export function resolveTestimonialsContentAlign(value: unknown): TestimonialsContentAlign {
  return resolveEnumValue(value, TESTIMONIALS_CONTENT_ALIGN_VALUES, DEFAULT_TESTIMONIALS_CONTENT_ALIGN)
}

export const TESTIMONIALS_CONTENT_ALIGN_CLASS: Record<TestimonialsContentAlign, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
}
