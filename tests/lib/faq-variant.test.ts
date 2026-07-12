import { describe, expect, it } from "vitest"
import {
  FAQ_COLUMNS_CLASS,
  FAQ_ITEM_STYLE_CLASS,
  resolveFaqColumns,
  resolveFaqItemStyle,
} from "@/lib/sections/faq-variant"

describe("resolveFaqColumns", () => {
  it("accepts every declared option", () => {
    expect(resolveFaqColumns("1")).toBe("1")
    expect(resolveFaqColumns("2")).toBe("2")
  })

  it("falls back to '1' (today's default column count) for an invalid or missing value", () => {
    expect(resolveFaqColumns(undefined)).toBe("1")
    expect(resolveFaqColumns("")).toBe("1")
    expect(resolveFaqColumns("3")).toBe("1")
  })

  it("maps every column count to a matching grid class", () => {
    expect(FAQ_COLUMNS_CLASS["1"]).toBe("grid-cols-1")
    expect(FAQ_COLUMNS_CLASS["2"]).toBe("grid-cols-1 md:grid-cols-2")
  })
})

describe("resolveFaqItemStyle", () => {
  it("accepts every declared option", () => {
    expect(resolveFaqItemStyle("divided")).toBe("divided")
    expect(resolveFaqItemStyle("card")).toBe("card")
  })

  it("falls back to 'divided' (today's default) for an invalid or missing value", () => {
    expect(resolveFaqItemStyle(undefined)).toBe("divided")
    expect(resolveFaqItemStyle("bubble")).toBe("divided")
  })

  it("only gives the rounded, shadowed container to 'card'", () => {
    expect(FAQ_ITEM_STYLE_CLASS.card).toContain("rounded-card")
    expect(FAQ_ITEM_STYLE_CLASS.divided).not.toContain("rounded-card")
  })
})
