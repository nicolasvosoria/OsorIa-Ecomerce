import { describe, expect, it } from "vitest"
import { resolveHeaderStickyMode } from "@/lib/header/header-sticky-mode"

describe("resolveHeaderStickyMode", () => {
  it("defaults classic to smart when no override is set", () => {
    expect(resolveHeaderStickyMode("", "classic")).toBe("smart")
    expect(resolveHeaderStickyMode(undefined, "classic")).toBe("smart")
  })

  it("defaults compact to fixed when no override is set", () => {
    expect(resolveHeaderStickyMode("", "compact")).toBe("fixed")
  })

  it("defaults centered to smart when no override is set", () => {
    expect(resolveHeaderStickyMode("", "centered")).toBe("smart")
  })

  it("falls back to the per-variant default for an invalid value", () => {
    expect(resolveHeaderStickyMode("brutalist", "compact")).toBe("fixed")
  })

  it("honors an explicit override over the per-variant default", () => {
    expect(resolveHeaderStickyMode("none", "classic")).toBe("none")
    expect(resolveHeaderStickyMode("fixed", "classic")).toBe("fixed")
    expect(resolveHeaderStickyMode("smart", "compact")).toBe("smart")
  })
})
