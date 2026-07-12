import { describe, expect, it } from "vitest"
import {
  WHYUS_BAR_CONTENT_ALIGN_CLASS,
  WHYUS_COLUMNS_CLASS,
  WHYUS_ICON_STYLE_CLASS,
  WHYUS_ICON_STYLE_HAS_BG,
  resolveIconPosition,
  resolveIconStyle,
  resolveLayoutFormat,
  resolveWhyusColumns,
  resolveWhyusContentAlign,
} from "@/lib/sections/whyus-variant"

describe("resolveWhyusColumns", () => {
  it("accepts every declared option", () => {
    expect(resolveWhyusColumns("2")).toBe("2")
    expect(resolveWhyusColumns("3")).toBe("3")
    expect(resolveWhyusColumns("4")).toBe("4")
  })

  it("falls back to '4' (today's default column count) for an invalid or missing value", () => {
    expect(resolveWhyusColumns(undefined)).toBe("4")
    expect(resolveWhyusColumns("")).toBe("4")
    expect(resolveWhyusColumns("5")).toBe("4")
  })

  it("reproduces today's hardcoded `grid-cols-2 md:grid-cols-4` byte-for-byte at the default", () => {
    expect(WHYUS_COLUMNS_CLASS["4"]).toBe("grid-cols-2 md:grid-cols-4")
  })

  it("never gates a column count behind `lg:` (invisible in the narrower editor preview)", () => {
    for (const columnsClass of Object.values(WHYUS_COLUMNS_CLASS)) {
      expect(columnsClass).not.toContain("lg:")
    }
  })
})

describe("resolveIconStyle", () => {
  it("accepts every declared option", () => {
    expect(resolveIconStyle("roundedSquare")).toBe("roundedSquare")
    expect(resolveIconStyle("circle")).toBe("circle")
    expect(resolveIconStyle("plain")).toBe("plain")
  })

  it("falls back to 'roundedSquare' (today's default icon container) for an invalid or missing value", () => {
    expect(resolveIconStyle(undefined)).toBe("roundedSquare")
    expect(resolveIconStyle("hexagon")).toBe("roundedSquare")
  })

  it("reproduces today's hardcoded rounded-xl icon container byte-for-byte at the default", () => {
    expect(WHYUS_ICON_STYLE_CLASS.roundedSquare).toBe(
      "flex h-12 w-12 items-center justify-center rounded-xl md:h-14 md:w-14",
    )
  })

  it("only drops the background container for 'plain'", () => {
    expect(WHYUS_ICON_STYLE_HAS_BG.roundedSquare).toBe(true)
    expect(WHYUS_ICON_STYLE_HAS_BG.circle).toBe(true)
    expect(WHYUS_ICON_STYLE_HAS_BG.plain).toBe(false)
  })
})

describe("resolveWhyusContentAlign", () => {
  it("accepts every declared option", () => {
    expect(resolveWhyusContentAlign("left")).toBe("left")
    expect(resolveWhyusContentAlign("center")).toBe("center")
  })

  it("falls back to 'left' (today's default) for an invalid or missing value", () => {
    expect(resolveWhyusContentAlign(undefined)).toBe("left")
    expect(resolveWhyusContentAlign("right")).toBe("left")
  })
})

describe("resolveIconPosition", () => {
  it("accepts every declared option", () => {
    expect(resolveIconPosition("top")).toBe("top")
    expect(resolveIconPosition("side")).toBe("side")
  })

  it("falls back to 'top' (today's default) for an invalid or missing value", () => {
    expect(resolveIconPosition(undefined)).toBe("top")
    expect(resolveIconPosition("bottom")).toBe("top")
  })
})

describe("WHYUS_BAR_CONTENT_ALIGN_CLASS", () => {
  it("reproduces today's hardcoded `md:justify-between` byte-for-byte at the default ('left')", () => {
    expect(WHYUS_BAR_CONTENT_ALIGN_CLASS.left).toBe("md:justify-between")
  })

  it("only 'center' changes the bar's justification", () => {
    expect(WHYUS_BAR_CONTENT_ALIGN_CLASS.center).toBe("md:justify-center")
  })
})

describe("resolveLayoutFormat", () => {
  it("accepts every declared option", () => {
    expect(resolveLayoutFormat("cards")).toBe("cards")
    expect(resolveLayoutFormat("bar")).toBe("bar")
  })

  it("falls back to 'cards' (today's default) for an invalid or missing value", () => {
    expect(resolveLayoutFormat(undefined)).toBe("cards")
    expect(resolveLayoutFormat("list")).toBe("cards")
  })
})
