import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const STORY_IMAGE_POSITION_OPTIONS = [
  { value: "right", label: "Derecha" },
  { value: "left", label: "Izquierda" },
  { value: "none", label: "Sin imagen" },
] as const

export type StoryImagePosition = (typeof STORY_IMAGE_POSITION_OPTIONS)[number]["value"]

const STORY_IMAGE_POSITION_VALUES = STORY_IMAGE_POSITION_OPTIONS.map((option) => option.value)

const DEFAULT_STORY_IMAGE_POSITION: StoryImagePosition = "right"

export function resolveStoryImagePosition(value: unknown): StoryImagePosition {
  return resolveEnumValue(value, STORY_IMAGE_POSITION_VALUES, DEFAULT_STORY_IMAGE_POSITION)
}

// Column order for the text block: "right"/"none" keep text first (image, if
// any, follows), "left" flips the image ahead of the text on `md`+.
export const STORY_IMAGE_POSITION_TEXT_ORDER_CLASS: Record<StoryImagePosition, string> = {
  right: "md:order-1",
  left: "md:order-2",
  none: "md:order-1",
}

export const STORY_IMAGE_POSITION_IMAGE_ORDER_CLASS: Record<StoryImagePosition, string> = {
  right: "md:order-2",
  left: "md:order-1",
  none: "md:order-2",
}

export const STORY_CONTENT_ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
] as const

export type StoryContentAlign = (typeof STORY_CONTENT_ALIGN_OPTIONS)[number]["value"]

const STORY_CONTENT_ALIGN_VALUES = STORY_CONTENT_ALIGN_OPTIONS.map((option) => option.value)

const DEFAULT_STORY_CONTENT_ALIGN: StoryContentAlign = "left"

export function resolveStoryContentAlign(value: unknown): StoryContentAlign {
  return resolveEnumValue(value, STORY_CONTENT_ALIGN_VALUES, DEFAULT_STORY_CONTENT_ALIGN)
}

export const STORY_CONTENT_ALIGN_CLASS: Record<StoryContentAlign, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
}
