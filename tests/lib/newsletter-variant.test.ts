import { describe, expect, it } from "vitest"
import {
  NEWSLETTER_CONTENT_ALIGN_CLASS,
  resolveLayout,
  resolveNewsletterContentAlign,
} from "@/lib/sections/newsletter-variant"

describe("resolveNewsletterContentAlign", () => {
  it("accepts every declared option", () => {
    expect(resolveNewsletterContentAlign("center")).toBe("center")
    expect(resolveNewsletterContentAlign("left")).toBe("left")
  })

  it("falls back to 'center' (today's default) for an invalid or missing value", () => {
    expect(resolveNewsletterContentAlign(undefined)).toBe("center")
    expect(resolveNewsletterContentAlign("")).toBe("center")
    expect(resolveNewsletterContentAlign("right")).toBe("center")
  })

  it("reproduces today's hardcoded `items-center ... text-center` byte-for-byte at the default", () => {
    expect(NEWSLETTER_CONTENT_ALIGN_CLASS.center).toBe("items-center text-center")
  })
})

describe("resolveLayout", () => {
  it("accepts every declared option", () => {
    expect(resolveLayout("stacked")).toBe("stacked")
    expect(resolveLayout("split")).toBe("split")
  })

  it("falls back to 'stacked' (today's default single-column layout) for an invalid or missing value", () => {
    expect(resolveLayout(undefined)).toBe("stacked")
    expect(resolveLayout("")).toBe("stacked")
    expect(resolveLayout("grid")).toBe("stacked")
  })
})
