import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const HERO_SECTION_HEIGHT_OPTIONS = [
  { value: "compact", label: "Compacto" },
  { value: "standard", label: "Estándar" },
  { value: "tall", label: "Alto" },
  { value: "fullscreen", label: "Pantalla completa" },
] as const

export type HeroSectionHeight = (typeof HERO_SECTION_HEIGHT_OPTIONS)[number]["value"]

const HERO_SECTION_HEIGHT_VALUES = HERO_SECTION_HEIGHT_OPTIONS.map((option) => option.value)

const DEFAULT_HERO_SECTION_HEIGHT: HeroSectionHeight = "standard"

export function resolveHeroSectionHeight(value: unknown): HeroSectionHeight {
  return resolveEnumValue(value, HERO_SECTION_HEIGHT_VALUES, DEFAULT_HERO_SECTION_HEIGHT)
}

export const HERO_SECTION_HEIGHT_FULL_IMAGE_CLASS: Record<HeroSectionHeight, string> = {
  compact: "min-h-[420px] md:aspect-[16/9] md:min-h-[520px] max-h-[680px]",
  standard: "min-h-[580px] md:aspect-[16/9] md:min-h-[700px] max-h-[900px]",
  tall: "min-h-[680px] md:aspect-[16/9] md:min-h-[820px] max-h-[1040px]",
  fullscreen: "min-h-[100svh] md:min-h-screen",
}

export const HERO_SECTION_HEIGHT_SPLIT_CLASS: Record<HeroSectionHeight, string> = {
  compact: "h-[200px] md:h-[320px] lg:h-[400px]",
  standard: "h-[250px] md:h-[400px] lg:h-[500px]",
  tall: "h-[320px] md:h-[480px] lg:h-[600px]",
  fullscreen: "min-h-[100svh] md:min-h-screen",
}

// Autoplay interval is stored as a number field (seconds), not an enum — a
// direct numeric guard rather than an OPTIONS/resolve pair, mirroring how
// `special-offer.tsx` guards its `claimedPercent` number field inline.
const DEFAULT_HERO_AUTOPLAY_INTERVAL_SECONDS = 10

export function resolveAutoplayIntervalSeconds(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HERO_AUTOPLAY_INTERVAL_SECONDS
}
