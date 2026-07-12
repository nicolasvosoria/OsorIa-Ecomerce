import { describe, expect, it } from "vitest"
import {
  TESTIMONIALS_CARD_STYLE_CLASS,
  TESTIMONIALS_COLUMNS_CLASS,
  resolveTestimonialsCardStyle,
  resolveTestimonialsColumns,
  resolveTestimonialsContentAlign,
} from "@/lib/sections/testimonials-variant"

describe("resolveTestimonialsColumns", () => {
  it("accepts every declared option", () => {
    expect(resolveTestimonialsColumns("1")).toBe("1")
    expect(resolveTestimonialsColumns("2")).toBe("2")
    expect(resolveTestimonialsColumns("3")).toBe("3")
  })

  it("falls back to '3' (today's default column count) for an invalid or missing value", () => {
    expect(resolveTestimonialsColumns(undefined)).toBe("3")
    expect(resolveTestimonialsColumns("")).toBe("3")
    expect(resolveTestimonialsColumns("5")).toBe("3")
  })

  it("maps every column count to a matching grid class", () => {
    expect(TESTIMONIALS_COLUMNS_CLASS["1"]).toBe("grid-cols-1")
    expect(TESTIMONIALS_COLUMNS_CLASS["2"]).toBe("grid-cols-1 md:grid-cols-2")
    expect(TESTIMONIALS_COLUMNS_CLASS["3"]).toBe("grid-cols-1 md:grid-cols-3")
  })
})

describe("resolveTestimonialsCardStyle", () => {
  it("accepts every declared option", () => {
    expect(resolveTestimonialsCardStyle("card")).toBe("card")
    expect(resolveTestimonialsCardStyle("quote")).toBe("quote")
  })

  it("falls back to 'card' (today's default) for an invalid or missing value", () => {
    expect(resolveTestimonialsCardStyle(undefined)).toBe("card")
    expect(resolveTestimonialsCardStyle("bubble")).toBe("card")
  })

  it("only gives the bordered container to 'card'", () => {
    expect(TESTIMONIALS_CARD_STYLE_CLASS.card).toContain("border")
    expect(TESTIMONIALS_CARD_STYLE_CLASS.quote).not.toContain("border")
  })
})

describe("resolveTestimonialsContentAlign", () => {
  it("accepts every declared option", () => {
    expect(resolveTestimonialsContentAlign("left")).toBe("left")
    expect(resolveTestimonialsContentAlign("center")).toBe("center")
  })

  it("falls back to 'left' (today's default) for an invalid or missing value", () => {
    expect(resolveTestimonialsContentAlign(undefined)).toBe("left")
    expect(resolveTestimonialsContentAlign("right")).toBe("left")
  })
})
