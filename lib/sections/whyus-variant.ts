import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const WHYUS_COLUMNS_OPTIONS = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
] as const

export type WhyUsColumns = (typeof WHYUS_COLUMNS_OPTIONS)[number]["value"]

const WHYUS_COLUMNS_VALUES = WHYUS_COLUMNS_OPTIONS.map((option) => option.value)

const DEFAULT_WHYUS_COLUMNS: WhyUsColumns = "4"

export function resolveWhyusColumns(value: unknown): WhyUsColumns {
  return resolveEnumValue(value, WHYUS_COLUMNS_VALUES, DEFAULT_WHYUS_COLUMNS)
}

// Uses `md:` (not `lg:`) — see the preview-width rationale on
// `POPULAR_COLUMNS_CLASS` in `lib/sections/popular-variant.ts`.
export const WHYUS_COLUMNS_CLASS: Record<WhyUsColumns, string> = {
  "2": "grid-cols-2",
  "3": "grid-cols-2 md:grid-cols-3",
  "4": "grid-cols-2 md:grid-cols-4",
}

export const WHYUS_ICON_STYLE_OPTIONS = [
  { value: "roundedSquare", label: "Cuadrado redondeado" },
  { value: "circle", label: "Círculo" },
  { value: "plain", label: "Sin fondo" },
] as const

export type WhyUsIconStyle = (typeof WHYUS_ICON_STYLE_OPTIONS)[number]["value"]

const WHYUS_ICON_STYLE_VALUES = WHYUS_ICON_STYLE_OPTIONS.map((option) => option.value)

const DEFAULT_WHYUS_ICON_STYLE: WhyUsIconStyle = "roundedSquare"

export function resolveIconStyle(value: unknown): WhyUsIconStyle {
  return resolveEnumValue(value, WHYUS_ICON_STYLE_VALUES, DEFAULT_WHYUS_ICON_STYLE)
}

export const WHYUS_ICON_STYLE_CLASS: Record<WhyUsIconStyle, string> = {
  roundedSquare: "flex h-12 w-12 items-center justify-center rounded-xl md:h-14 md:w-14",
  circle: "flex h-12 w-12 items-center justify-center rounded-full md:h-14 md:w-14",
  plain: "flex h-12 w-12 items-center justify-center md:h-14 md:w-14",
}

export const WHYUS_ICON_STYLE_HAS_BG: Record<WhyUsIconStyle, boolean> = {
  roundedSquare: true,
  circle: true,
  plain: false,
}

export const WHYUS_CONTENT_ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
] as const

export type WhyUsContentAlign = (typeof WHYUS_CONTENT_ALIGN_OPTIONS)[number]["value"]

const WHYUS_CONTENT_ALIGN_VALUES = WHYUS_CONTENT_ALIGN_OPTIONS.map((option) => option.value)

const DEFAULT_WHYUS_CONTENT_ALIGN: WhyUsContentAlign = "left"

export function resolveWhyusContentAlign(value: unknown): WhyUsContentAlign {
  return resolveEnumValue(value, WHYUS_CONTENT_ALIGN_VALUES, DEFAULT_WHYUS_CONTENT_ALIGN)
}

export const WHYUS_CONTENT_ALIGN_CARD_CLASS: Record<WhyUsContentAlign, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
}

export const WHYUS_ICON_POSITION_OPTIONS = [
  { value: "top", label: "Arriba" },
  { value: "side", label: "Al lado" },
] as const

export type WhyUsIconPosition = (typeof WHYUS_ICON_POSITION_OPTIONS)[number]["value"]

const WHYUS_ICON_POSITION_VALUES = WHYUS_ICON_POSITION_OPTIONS.map((option) => option.value)

const DEFAULT_WHYUS_ICON_POSITION: WhyUsIconPosition = "top"

export function resolveIconPosition(value: unknown): WhyUsIconPosition {
  return resolveEnumValue(value, WHYUS_ICON_POSITION_VALUES, DEFAULT_WHYUS_ICON_POSITION)
}

export const WHYUS_ICON_POSITION_DIRECTION_CLASS: Record<WhyUsIconPosition, string> = {
  top: "flex-col",
  side: "flex-row gap-4",
}

export const WHYUS_ICON_POSITION_TEXT_WRAPPER_CLASS: Record<WhyUsIconPosition, string> = {
  top: "mt-auto",
  side: "min-w-0 flex-1",
}

export const WHYUS_ICON_POSITION_ICON_EXTRA_CLASS: Record<WhyUsIconPosition, string> = {
  top: "",
  side: "shrink-0",
}

export const WHYUS_LAYOUT_FORMAT_OPTIONS = [
  { value: "cards", label: "Tarjetas" },
  { value: "bar", label: "Barra compacta" },
] as const

export type WhyUsLayoutFormat = (typeof WHYUS_LAYOUT_FORMAT_OPTIONS)[number]["value"]

const WHYUS_LAYOUT_FORMAT_VALUES = WHYUS_LAYOUT_FORMAT_OPTIONS.map((option) => option.value)

const DEFAULT_WHYUS_LAYOUT_FORMAT: WhyUsLayoutFormat = "cards"

export function resolveLayoutFormat(value: unknown): WhyUsLayoutFormat {
  return resolveEnumValue(value, WHYUS_LAYOUT_FORMAT_VALUES, DEFAULT_WHYUS_LAYOUT_FORMAT)
}
