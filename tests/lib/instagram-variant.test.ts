import { describe, expect, it } from "vitest"
import {
  INSTAGRAM_COLUMNS_CLASS,
  INSTAGRAM_GAP_CLASS,
  resolveInstagramColumns,
  resolveInstagramGap,
} from "@/lib/sections/instagram-variant"

describe("resolveInstagramColumns", () => {
  it("accepts every declared option", () => {
    expect(resolveInstagramColumns("3")).toBe("3")
    expect(resolveInstagramColumns("4")).toBe("4")
    expect(resolveInstagramColumns("6")).toBe("6")
  })

  it("falls back to '4' (today's default column count) for an invalid or missing value", () => {
    expect(resolveInstagramColumns(undefined)).toBe("4")
    expect(resolveInstagramColumns("")).toBe("4")
    expect(resolveInstagramColumns("9")).toBe("4")
  })

  it("maps every column count to a matching grid class", () => {
    expect(INSTAGRAM_COLUMNS_CLASS["3"]).toBe("grid-cols-3")
    expect(INSTAGRAM_COLUMNS_CLASS["4"]).toBe("grid-cols-2 md:grid-cols-4")
    expect(INSTAGRAM_COLUMNS_CLASS["6"]).toBe("grid-cols-3 md:grid-cols-6")
  })
})

describe("resolveInstagramGap", () => {
  it("accepts every declared option", () => {
    expect(resolveInstagramGap("none")).toBe("none")
    expect(resolveInstagramGap("sm")).toBe("sm")
    expect(resolveInstagramGap("md")).toBe("md")
  })

  it("falls back to 'sm' (today's default) for an invalid or missing value", () => {
    expect(resolveInstagramGap(undefined)).toBe("sm")
    expect(resolveInstagramGap("lg")).toBe("sm")
  })

  it("maps every gap option to a matching gap class", () => {
    expect(INSTAGRAM_GAP_CLASS.none).toBe("gap-0")
    expect(INSTAGRAM_GAP_CLASS.sm).toBe("gap-2 md:gap-3")
    expect(INSTAGRAM_GAP_CLASS.md).toBe("gap-4 md:gap-6")
  })
})
