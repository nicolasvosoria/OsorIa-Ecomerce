import { describe, expect, it } from "vitest"
import {
  POPULAR_OVERLAY_CONTAINER_CLASS,
  POPULAR_OVERLAY_CTA_CLASS,
  POPULAR_OVERLAY_PRICE_CLASS,
  POPULAR_OVERLAY_TITLE_CLASS,
  resolveCategoryTilesOverride,
  resolveGridLayout,
  resolvePopularColumns,
  resolveTextPlacement,
  resolveTileAspect,
} from "@/lib/sections/popular-variant"

describe("resolvePopularColumns", () => {
  it("accepts every declared option", () => {
    expect(resolvePopularColumns("2")).toBe("2")
    expect(resolvePopularColumns("3")).toBe("3")
    expect(resolvePopularColumns("4")).toBe("4")
  })

  it("falls back to '2' (today's default column count) for an invalid or missing value", () => {
    expect(resolvePopularColumns(undefined)).toBe("2")
    expect(resolvePopularColumns("")).toBe("2")
    expect(resolvePopularColumns("5")).toBe("2")
  })
})

describe("resolveTileAspect", () => {
  it("accepts every declared option", () => {
    expect(resolveTileAspect("actual")).toBe("actual")
    expect(resolveTileAspect("cuadrado")).toBe("cuadrado")
    expect(resolveTileAspect("retrato")).toBe("retrato")
    expect(resolveTileAspect("paisaje")).toBe("paisaje")
  })

  it("falls back to 'actual' (today's hardcoded 6:5 aspect) for an invalid or missing value", () => {
    expect(resolveTileAspect(undefined)).toBe("actual")
    expect(resolveTileAspect("")).toBe("actual")
    expect(resolveTileAspect("hexagonal")).toBe("actual")
  })
})

describe("resolveTextPlacement", () => {
  it("accepts every declared option", () => {
    expect(resolveTextPlacement("overlay")).toBe("overlay")
    expect(resolveTextPlacement("below")).toBe("below")
  })

  it("falls back to 'overlay' (today's default) for an invalid or missing value", () => {
    expect(resolveTextPlacement(undefined)).toBe("overlay")
    expect(resolveTextPlacement("above")).toBe("overlay")
  })
})

describe("resolveGridLayout", () => {
  it("accepts every declared option", () => {
    expect(resolveGridLayout("uniform")).toBe("uniform")
    expect(resolveGridLayout("mosaic")).toBe("mosaic")
  })

  it("falls back to 'uniform' (today's default) for an invalid or missing value", () => {
    expect(resolveGridLayout(undefined)).toBe("uniform")
    expect(resolveGridLayout("random")).toBe("uniform")
  })
})

describe("overlay sizing scales down as columns grow", () => {
  it("keeps the 2-column overlay classes identical to today's hardcoded values", () => {
    expect(POPULAR_OVERLAY_CONTAINER_CLASS["2"]).toBe("gap-2 p-[30px]")
    expect(POPULAR_OVERLAY_TITLE_CLASS["2"]).toBe(
      "text-[24px] sm:text-[30px] md:text-[34px] lg:text-[40px] leading-tight",
    )
    expect(POPULAR_OVERLAY_PRICE_CLASS["2"]).toBe("text-[13px] sm:text-[16px] md:text-[18px] lg:text-[21px]")
    expect(POPULAR_OVERLAY_CTA_CLASS["2"]).toBe("mt-2 min-h-[44px] px-5 text-base")
  })

  it("shrinks title, price, and CTA sizing/spacing at 3 and 4 columns so nothing overlaps or clips", () => {
    for (const key of ["3", "4"] as const) {
      expect(POPULAR_OVERLAY_TITLE_CLASS[key]).not.toBe(POPULAR_OVERLAY_TITLE_CLASS["2"])
      expect(POPULAR_OVERLAY_PRICE_CLASS[key]).not.toBe(POPULAR_OVERLAY_PRICE_CLASS["2"])
      expect(POPULAR_OVERLAY_CTA_CLASS[key]).not.toBe(POPULAR_OVERLAY_CTA_CLASS["2"])
      expect(POPULAR_OVERLAY_CONTAINER_CLASS[key]).not.toBe(POPULAR_OVERLAY_CONTAINER_CLASS["2"])
    }

    // 4 columns is the tightest fit reported: its title/price/CTA/padding
    // must all be smaller than (or equal to, for CTA min-height) 3 columns.
    expect(POPULAR_OVERLAY_TITLE_CLASS["4"]).toContain("text-[16px]")
    expect(POPULAR_OVERLAY_TITLE_CLASS["4"]).toContain("lg:text-[22px]")
    expect(POPULAR_OVERLAY_CTA_CLASS["4"]).toContain("min-h-[32px]")
    expect(POPULAR_OVERLAY_CONTAINER_CLASS["4"]).toContain("p-[14px]")
  })
})

describe("resolveCategoryTilesOverride", () => {
  it("returns an empty array for a missing or non-array value", () => {
    expect(resolveCategoryTilesOverride(undefined)).toEqual([])
    expect(resolveCategoryTilesOverride(null)).toEqual([])
    expect(resolveCategoryTilesOverride("not-an-array")).toEqual([])
  })

  it("keeps categoryId + imageUrl for well-formed entries, in order", () => {
    const result = resolveCategoryTilesOverride([
      { categoryId: "cat-1", imageUrl: "/tile-1.webp" },
      { categoryId: "cat-2" },
    ])

    expect(result).toEqual([{ categoryId: "cat-1", imageUrl: "/tile-1.webp" }, { categoryId: "cat-2" }])
  })

  it("drops entries without a categoryId (e.g. a freshly-added, not-yet-picked array item)", () => {
    expect(resolveCategoryTilesOverride([{ categoryId: "" }, { imageUrl: "/only-image.webp" }, null])).toEqual([])
  })

  it("normalizes a blank imageUrl to 'not set' instead of an empty string override", () => {
    expect(resolveCategoryTilesOverride([{ categoryId: "cat-1", imageUrl: "" }])).toEqual([
      { categoryId: "cat-1" },
    ])
  })
})
