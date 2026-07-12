import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const VIDEO_ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 (panorámico)" },
  { value: "4:3", label: "4:3 (clásico)" },
  { value: "1:1", label: "1:1 (cuadrado)" },
  { value: "21:9", label: "21:9 (cine)" },
] as const

export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIO_OPTIONS)[number]["value"]

const VIDEO_ASPECT_RATIO_VALUES = VIDEO_ASPECT_RATIO_OPTIONS.map((option) => option.value)

const DEFAULT_VIDEO_ASPECT_RATIO: VideoAspectRatio = "16:9"

export function resolveVideoAspectRatio(value: unknown): VideoAspectRatio {
  return resolveEnumValue(value, VIDEO_ASPECT_RATIO_VALUES, DEFAULT_VIDEO_ASPECT_RATIO)
}

export const VIDEO_ASPECT_RATIO_CLASS: Record<VideoAspectRatio, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "21:9": "aspect-[21/9]",
}
