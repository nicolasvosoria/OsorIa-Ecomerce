import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const SPECIAL_OFFER_IMAGE_SIDE_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
] as const

export type SpecialOfferImageSide = (typeof SPECIAL_OFFER_IMAGE_SIDE_OPTIONS)[number]["value"]

const SPECIAL_OFFER_IMAGE_SIDE_VALUES = SPECIAL_OFFER_IMAGE_SIDE_OPTIONS.map((option) => option.value)

const DEFAULT_SPECIAL_OFFER_IMAGE_SIDE: SpecialOfferImageSide = "left"

export function resolveSpecialOfferImageSide(value: unknown): SpecialOfferImageSide {
  return resolveEnumValue(value, SPECIAL_OFFER_IMAGE_SIDE_VALUES, DEFAULT_SPECIAL_OFFER_IMAGE_SIDE)
}

// "right" flips both columns via `order` (not by reordering the DOM), so the
// image anchors on the right while tab/reading order stays put.
export const SPECIAL_OFFER_IMAGE_COLUMN_CLASS: Record<SpecialOfferImageSide, string> = {
  left: "",
  right: "md:order-2",
}

export const SPECIAL_OFFER_DETAILS_COLUMN_CLASS: Record<SpecialOfferImageSide, string> = {
  left: "",
  right: "md:order-1",
}
