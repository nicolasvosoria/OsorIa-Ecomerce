import { describe, expect, it } from "vitest"
import { sectionLabel } from "@/lib/section-editor/sections-registry"

describe("sections-registry", () => {
  it("resolves distinct labels for popular and products so their editor chips never collide", () => {
    expect(sectionLabel("popular")).toBe("Más vendidos")
    expect(sectionLabel("products")).toBe("Productos")
    expect(sectionLabel("popular")).not.toBe(sectionLabel("products"))
  })

  it("falls back to the key when a section has no registered label", () => {
    expect(sectionLabel("unknown-section")).toBe("unknown-section")
  })
})
