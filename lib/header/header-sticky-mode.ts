import type { HeaderLayoutVariant } from "@/lib/header/header-layout-variant"

export const HEADER_STICKY_MODE_OPTIONS = [
  { value: "", label: "Auto (por variante)" },
  { value: "none", label: "Ninguno" },
  { value: "fixed", label: "Fijo" },
  { value: "smart", label: "Inteligente" },
] as const

export type HeaderStickyMode = "none" | "fixed" | "smart"

const HEADER_STICKY_MODE_VALUES: HeaderStickyMode[] = ["none", "fixed", "smart"]

const DEFAULT_HEADER_STICKY_MODE_BY_VARIANT: Record<HeaderLayoutVariant, HeaderStickyMode> = {
  classic: "smart",
  compact: "fixed",
  centered: "smart",
}

export function resolveHeaderStickyMode(value: unknown, variant: HeaderLayoutVariant): HeaderStickyMode {
  if (typeof value === "string" && HEADER_STICKY_MODE_VALUES.includes(value as HeaderStickyMode)) {
    return value as HeaderStickyMode
  }

  return DEFAULT_HEADER_STICKY_MODE_BY_VARIANT[variant]
}
