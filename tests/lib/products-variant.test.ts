import { describe, expect, it } from "vitest"
import {
  resolveCardStyle,
  resolveHoverEffect,
  resolveItemCount,
  resolveProductsColumns,
} from "@/lib/sections/products-variant"

describe("resolveProductsColumns", () => {
  it("accepts every declared option", () => {
    expect(resolveProductsColumns("2")).toBe("2")
    expect(resolveProductsColumns("3")).toBe("3")
    expect(resolveProductsColumns("4")).toBe("4")
  })

  it("falls back to '4' (today's default column count) for an invalid or missing value", () => {
    expect(resolveProductsColumns(undefined)).toBe("4")
    expect(resolveProductsColumns("")).toBe("4")
    expect(resolveProductsColumns("5")).toBe("4")
  })
})

describe("resolveCardStyle", () => {
  it("accepts every declared option", () => {
    expect(resolveCardStyle("shadow")).toBe("shadow")
    expect(resolveCardStyle("bordered")).toBe("bordered")
    expect(resolveCardStyle("flat")).toBe("flat")
  })

  it("falls back to 'shadow' (today's default look) for an invalid or missing value", () => {
    expect(resolveCardStyle(undefined)).toBe("shadow")
    expect(resolveCardStyle("")).toBe("shadow")
    expect(resolveCardStyle("brutalist")).toBe("shadow")
  })
})

describe("resolveHoverEffect", () => {
  it("accepts every declared option", () => {
    expect(resolveHoverEffect("lift")).toBe("lift")
    expect(resolveHoverEffect("zoom")).toBe("zoom")
    expect(resolveHoverEffect("none")).toBe("none")
  })

  it("falls back to 'lift' (today's default hover behavior) for an invalid or missing value", () => {
    expect(resolveHoverEffect(undefined)).toBe("lift")
    expect(resolveHoverEffect("spin")).toBe("lift")
  })
})

describe("resolveItemCount", () => {
  it("accepts every declared option, coercing the stored string to a number", () => {
    expect(resolveItemCount("4")).toBe(4)
    expect(resolveItemCount("6")).toBe(6)
    expect(resolveItemCount("8")).toBe(8)
    expect(resolveItemCount("12")).toBe(12)
  })

  it("falls back to 4 (today's default count) for an invalid or missing value", () => {
    expect(resolveItemCount(undefined)).toBe(4)
    expect(resolveItemCount("")).toBe(4)
    expect(resolveItemCount("5")).toBe(4)
  })
})
