import { describe, expect, it } from "vitest"
import {
  SPECIAL_OFFER_DETAILS_COLUMN_CLASS,
  SPECIAL_OFFER_IMAGE_COLUMN_CLASS,
  resolveSpecialOfferImageSide,
} from "@/lib/sections/special-offer-variant"

describe("resolveSpecialOfferImageSide", () => {
  it("accepts every declared option", () => {
    expect(resolveSpecialOfferImageSide("left")).toBe("left")
    expect(resolveSpecialOfferImageSide("right")).toBe("right")
  })

  it("falls back to 'left' (today's hardcoded layout) for an invalid or missing value", () => {
    expect(resolveSpecialOfferImageSide(undefined)).toBe("left")
    expect(resolveSpecialOfferImageSide("")).toBe("left")
    expect(resolveSpecialOfferImageSide("top")).toBe("left")
  })
})

describe("literal class maps reproduce today's hardcoded DOM order at the default option", () => {
  it("keeps 'left' free of any order override, matching the original DOM order", () => {
    expect(SPECIAL_OFFER_IMAGE_COLUMN_CLASS.left).toBe("")
    expect(SPECIAL_OFFER_DETAILS_COLUMN_CLASS.left).toBe("")
  })

  it("flips both columns via order utilities for 'right'", () => {
    expect(SPECIAL_OFFER_IMAGE_COLUMN_CLASS.right).toBe("md:order-2")
    expect(SPECIAL_OFFER_DETAILS_COLUMN_CLASS.right).toBe("md:order-1")
  })
})
