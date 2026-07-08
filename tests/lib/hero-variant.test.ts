import { describe, expect, it } from "vitest"
import {
  HERO_SECTION_HEIGHT_FULL_IMAGE_CLASS,
  HERO_SECTION_HEIGHT_SPLIT_CLASS,
  resolveAutoplayIntervalSeconds,
  resolveHeroSectionHeight,
} from "@/lib/sections/hero-variant"

describe("resolveHeroSectionHeight", () => {
  it("accepts every declared option", () => {
    expect(resolveHeroSectionHeight("compact")).toBe("compact")
    expect(resolveHeroSectionHeight("standard")).toBe("standard")
    expect(resolveHeroSectionHeight("tall")).toBe("tall")
    expect(resolveHeroSectionHeight("fullscreen")).toBe("fullscreen")
  })

  it("falls back to 'standard' (today's hardcoded stage size) for an invalid or missing value", () => {
    expect(resolveHeroSectionHeight(undefined)).toBe("standard")
    expect(resolveHeroSectionHeight("")).toBe("standard")
    expect(resolveHeroSectionHeight("huge")).toBe("standard")
  })
})

describe("HERO_SECTION_HEIGHT_FULL_IMAGE_CLASS", () => {
  it("reproduces today's hardcoded full-image stage size byte-for-byte for 'standard'", () => {
    expect(HERO_SECTION_HEIGHT_FULL_IMAGE_CLASS.standard).toBe(
      "min-h-[580px] md:aspect-[16/9] md:min-h-[700px] max-h-[900px]",
    )
  })

  it("uses viewport-filling classes for 'fullscreen'", () => {
    expect(HERO_SECTION_HEIGHT_FULL_IMAGE_CLASS.fullscreen).toBe("min-h-[100svh] md:min-h-screen")
  })
})

describe("HERO_SECTION_HEIGHT_SPLIT_CLASS", () => {
  it("reproduces today's hardcoded split-mode product-media height byte-for-byte for 'standard'", () => {
    expect(HERO_SECTION_HEIGHT_SPLIT_CLASS.standard).toBe("h-[250px] md:h-[400px] lg:h-[500px]")
  })
})

describe("resolveAutoplayIntervalSeconds", () => {
  it("accepts a positive numeric value", () => {
    expect(resolveAutoplayIntervalSeconds(5)).toBe(5)
    expect(resolveAutoplayIntervalSeconds("7")).toBe(7)
  })

  it("falls back to 10 (today's hardcoded 10s interval) for an invalid, zero, negative or missing value", () => {
    expect(resolveAutoplayIntervalSeconds(undefined)).toBe(10)
    expect(resolveAutoplayIntervalSeconds("")).toBe(10)
    expect(resolveAutoplayIntervalSeconds("not-a-number")).toBe(10)
    expect(resolveAutoplayIntervalSeconds(0)).toBe(10)
    expect(resolveAutoplayIntervalSeconds(-5)).toBe(10)
  })
})
