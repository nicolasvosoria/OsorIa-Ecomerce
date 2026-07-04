export const HEADER_LAYOUT_VARIANT_OPTIONS = [
  { value: "classic", label: "Clásico (referencia)" },
  { value: "compact", label: "Compacto" },
  { value: "centered", label: "Centrado" },
] as const

export type HeaderLayoutVariant = (typeof HEADER_LAYOUT_VARIANT_OPTIONS)[number]["value"]

const HEADER_LAYOUT_VARIANT_VALUES = HEADER_LAYOUT_VARIANT_OPTIONS.map((option) => option.value)

const DEFAULT_HEADER_LAYOUT_VARIANT: HeaderLayoutVariant = "classic"

export function resolveHeaderLayoutVariant(value: unknown): HeaderLayoutVariant {
  return typeof value === "string" && HEADER_LAYOUT_VARIANT_VALUES.includes(value as HeaderLayoutVariant)
    ? (value as HeaderLayoutVariant)
    : DEFAULT_HEADER_LAYOUT_VARIANT
}
