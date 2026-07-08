import { describe, expect, it } from "vitest"
import {
  FEATURED_CONTENT_WIDTH_CLASS,
  FEATURED_IMAGE_SIDE_BG_POSITION,
  FEATURED_IMAGE_SIDE_CONTENT_CLASS,
  FEATURED_SECTION_HEIGHT_CLASS,
  FEATURED_TEXT_ALIGN_CLASS,
  FEATURED_TEXT_ALIGN_ITEM_CLASS,
  resolveContentWidth,
  resolveFeaturedImageSide,
  resolveFeaturedSectionHeight,
  resolveTextAlign,
} from "@/lib/sections/featured-variant"

describe("resolveFeaturedImageSide", () => {
  it("accepts every declared option", () => {
    expect(resolveFeaturedImageSide("right")).toBe("right")
    expect(resolveFeaturedImageSide("left")).toBe("left")
  })

  it("falls back to 'right' (today's hardcoded layout) for an invalid or missing value", () => {
    expect(resolveFeaturedImageSide(undefined)).toBe("right")
    expect(resolveFeaturedImageSide("")).toBe("right")
    expect(resolveFeaturedImageSide("top")).toBe("right")
  })
})

describe("resolveContentWidth", () => {
  it("accepts every declared option", () => {
    expect(resolveContentWidth("balanced")).toBe("balanced")
    expect(resolveContentWidth("content")).toBe("content")
    expect(resolveContentWidth("image")).toBe("image")
  })

  it("falls back to 'balanced' (today's 56% content column) for an invalid or missing value", () => {
    expect(resolveContentWidth(undefined)).toBe("balanced")
    expect(resolveContentWidth("huge")).toBe("balanced")
  })
})

describe("resolveTextAlign", () => {
  it("accepts every declared option", () => {
    expect(resolveTextAlign("left")).toBe("left")
    expect(resolveTextAlign("center")).toBe("center")
  })

  it("falls back to 'left' (today's default) for an invalid or missing value", () => {
    expect(resolveTextAlign(undefined)).toBe("left")
    expect(resolveTextAlign("right")).toBe("left")
  })
})

describe("resolveFeaturedSectionHeight", () => {
  it("accepts every declared option", () => {
    expect(resolveFeaturedSectionHeight("standard")).toBe("standard")
    expect(resolveFeaturedSectionHeight("tall")).toBe("tall")
  })

  it("falls back to 'standard' (today's min-heights) for an invalid or missing value", () => {
    expect(resolveFeaturedSectionHeight(undefined)).toBe("standard")
    expect(resolveFeaturedSectionHeight("huge")).toBe("standard")
  })
})

describe("literal class/style maps reproduce today's hardcoded values at their default option", () => {
  it("keeps 'right' identical to the original background anchor and content alignment", () => {
    expect(FEATURED_IMAGE_SIDE_BG_POSITION.right).toBe("15% bottom")
    expect(FEATURED_IMAGE_SIDE_CONTENT_CLASS.right).toBe("ml-auto")
  })

  it("mirrors 'left' to the opposite anchor and alignment", () => {
    expect(FEATURED_IMAGE_SIDE_BG_POSITION.left).not.toBe(FEATURED_IMAGE_SIDE_BG_POSITION.right)
    expect(FEATURED_IMAGE_SIDE_CONTENT_CLASS.left).toBe("mr-auto")
  })

  it("keeps 'balanced' identical to the original md:w-[56%] lg:w-[50%] content width", () => {
    expect(FEATURED_CONTENT_WIDTH_CLASS.balanced).toBe("md:w-[56%] lg:w-[50%]")
  })

  it("gives 'content' a wider column and 'image' a narrower one than 'balanced'", () => {
    expect(FEATURED_CONTENT_WIDTH_CLASS.content).not.toBe(FEATURED_CONTENT_WIDTH_CLASS.balanced)
    expect(FEATURED_CONTENT_WIDTH_CLASS.image).not.toBe(FEATURED_CONTENT_WIDTH_CLASS.balanced)
  })

  it("keeps 'left' identical to the original md:text-left / md:mx-0", () => {
    expect(FEATURED_TEXT_ALIGN_CLASS.left).toBe("md:text-left")
    expect(FEATURED_TEXT_ALIGN_ITEM_CLASS.left).toBe("md:mx-0")
  })

  it("keeps 'standard' identical to the original min-heights", () => {
    expect(FEATURED_SECTION_HEIGHT_CLASS.standard).toBe("min-h-[480px] md:min-h-[560px] lg:min-h-[600px]")
  })

  it("gives 'tall' larger min-heights than 'standard'", () => {
    expect(FEATURED_SECTION_HEIGHT_CLASS.tall).not.toBe(FEATURED_SECTION_HEIGHT_CLASS.standard)
  })
})
