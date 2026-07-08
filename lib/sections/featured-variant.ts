import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const FEATURED_IMAGE_SIDE_OPTIONS = [
  { value: "right", label: "Derecha" },
  { value: "left", label: "Izquierda" },
] as const

export type FeaturedImageSide = (typeof FEATURED_IMAGE_SIDE_OPTIONS)[number]["value"]

const FEATURED_IMAGE_SIDE_VALUES = FEATURED_IMAGE_SIDE_OPTIONS.map((option) => option.value)

const DEFAULT_FEATURED_IMAGE_SIDE: FeaturedImageSide = "right"

export function resolveFeaturedImageSide(value: unknown): FeaturedImageSide {
  return resolveEnumValue(value, FEATURED_IMAGE_SIDE_VALUES, DEFAULT_FEATURED_IMAGE_SIDE)
}

export const FEATURED_IMAGE_SIDE_CONTENT_CLASS: Record<FeaturedImageSide, string> = {
  right: "ml-auto",
  left: "mr-auto",
}

export const FEATURED_IMAGE_SIDE_BG_POSITION: Record<FeaturedImageSide, string> = {
  right: "15% bottom",
  left: "85% bottom",
}

export const FEATURED_CONTENT_WIDTH_OPTIONS = [
  { value: "balanced", label: "Balanceado" },
  { value: "content", label: "Contenido amplio" },
  { value: "image", label: "Imagen amplia" },
] as const

export type FeaturedContentWidth = (typeof FEATURED_CONTENT_WIDTH_OPTIONS)[number]["value"]

const FEATURED_CONTENT_WIDTH_VALUES = FEATURED_CONTENT_WIDTH_OPTIONS.map((option) => option.value)

const DEFAULT_FEATURED_CONTENT_WIDTH: FeaturedContentWidth = "balanced"

export function resolveContentWidth(value: unknown): FeaturedContentWidth {
  return resolveEnumValue(value, FEATURED_CONTENT_WIDTH_VALUES, DEFAULT_FEATURED_CONTENT_WIDTH)
}

export const FEATURED_CONTENT_WIDTH_CLASS: Record<FeaturedContentWidth, string> = {
  balanced: "md:w-[56%] lg:w-[50%]",
  content: "md:w-[64%] lg:w-[60%]",
  image: "md:w-[40%] lg:w-[36%]",
}

export const FEATURED_TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
] as const

export type FeaturedTextAlign = (typeof FEATURED_TEXT_ALIGN_OPTIONS)[number]["value"]

const FEATURED_TEXT_ALIGN_VALUES = FEATURED_TEXT_ALIGN_OPTIONS.map((option) => option.value)

const DEFAULT_FEATURED_TEXT_ALIGN: FeaturedTextAlign = "left"

export function resolveTextAlign(value: unknown): FeaturedTextAlign {
  return resolveEnumValue(value, FEATURED_TEXT_ALIGN_VALUES, DEFAULT_FEATURED_TEXT_ALIGN)
}

// Mobile stays `text-center` regardless — that base class lives outside this map.
export const FEATURED_TEXT_ALIGN_CLASS: Record<FeaturedTextAlign, string> = {
  left: "md:text-left",
  center: "md:text-center",
}

export const FEATURED_TEXT_ALIGN_ITEM_CLASS: Record<FeaturedTextAlign, string> = {
  left: "md:mx-0",
  center: "md:mx-auto",
}

export const FEATURED_SECTION_HEIGHT_OPTIONS = [
  { value: "standard", label: "Estándar" },
  { value: "tall", label: "Alto" },
] as const

export type FeaturedSectionHeight = (typeof FEATURED_SECTION_HEIGHT_OPTIONS)[number]["value"]

const FEATURED_SECTION_HEIGHT_VALUES = FEATURED_SECTION_HEIGHT_OPTIONS.map((option) => option.value)

const DEFAULT_FEATURED_SECTION_HEIGHT: FeaturedSectionHeight = "standard"

export function resolveFeaturedSectionHeight(value: unknown): FeaturedSectionHeight {
  return resolveEnumValue(value, FEATURED_SECTION_HEIGHT_VALUES, DEFAULT_FEATURED_SECTION_HEIGHT)
}

export const FEATURED_SECTION_HEIGHT_CLASS: Record<FeaturedSectionHeight, string> = {
  standard: "min-h-[480px] md:min-h-[560px] lg:min-h-[600px]",
  tall: "min-h-[560px] md:min-h-[640px] lg:min-h-[720px]",
}
