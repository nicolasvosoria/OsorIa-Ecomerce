import { describe, expect, it } from "vitest"
import {
  LOGOS_ALIGN_CLASS,
  LOGOS_COLUMNS_CLASS,
  LOGOS_SIZE_CLASS,
  resolveLogosAlign,
  resolveLogosColumns,
  resolveLogosSize,
} from "@/lib/sections/logos-variant"

describe("resolveLogosColumns", () => {
  it("accepts every declared option", () => {
    expect(resolveLogosColumns("2")).toBe("2")
    expect(resolveLogosColumns("3")).toBe("3")
    expect(resolveLogosColumns("4")).toBe("4")
    expect(resolveLogosColumns("5")).toBe("5")
    expect(resolveLogosColumns("6")).toBe("6")
  })

  it("falls back to '5' (today's default column count) for an invalid or missing value", () => {
    expect(resolveLogosColumns(undefined)).toBe("5")
    expect(resolveLogosColumns("")).toBe("5")
    expect(resolveLogosColumns("9")).toBe("5")
  })

  it("maps every column count to a matching grid class", () => {
    expect(LOGOS_COLUMNS_CLASS["2"]).toBe("grid-cols-2")
    expect(LOGOS_COLUMNS_CLASS["6"]).toBe("grid-cols-2 md:grid-cols-6")
  })
})

describe("resolveLogosSize", () => {
  it("accepts every declared option", () => {
    expect(resolveLogosSize("sm")).toBe("sm")
    expect(resolveLogosSize("md")).toBe("md")
    expect(resolveLogosSize("lg")).toBe("lg")
  })

  it("falls back to 'md' (today's default) for an invalid or missing value", () => {
    expect(resolveLogosSize(undefined)).toBe("md")
    expect(resolveLogosSize("xl")).toBe("md")
  })

  it("maps every size to a height utility class", () => {
    expect(LOGOS_SIZE_CLASS.sm).toBe("h-8 w-auto")
    expect(LOGOS_SIZE_CLASS.md).toBe("h-10 w-auto")
    expect(LOGOS_SIZE_CLASS.lg).toBe("h-14 w-auto")
  })
})

describe("resolveLogosAlign", () => {
  it("accepts every declared option", () => {
    expect(resolveLogosAlign("left")).toBe("left")
    expect(resolveLogosAlign("center")).toBe("center")
  })

  it("falls back to 'center' (today's default) for an invalid or missing value", () => {
    expect(resolveLogosAlign(undefined)).toBe("center")
    expect(resolveLogosAlign("right")).toBe("center")
  })

  it("maps every alignment to a matching justify-items class", () => {
    expect(LOGOS_ALIGN_CLASS.left).toBe("justify-items-start")
    expect(LOGOS_ALIGN_CLASS.center).toBe("justify-items-center")
  })
})
