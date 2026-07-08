import { describe, expect, it } from "vitest"
import { isToggleOn } from "@/lib/section-editor/toggle-value"

describe("isToggleOn", () => {
  it("treats the real boolean true as on", () => {
    expect(isToggleOn(true)).toBe(true)
  })

  it("treats the legacy 'si'/'true'/'1' strings as on", () => {
    expect(isToggleOn("si")).toBe(true)
    expect(isToggleOn("true")).toBe(true)
    expect(isToggleOn("1")).toBe(true)
  })

  it("treats false, 'no', and any other value as off", () => {
    expect(isToggleOn(false)).toBe(false)
    expect(isToggleOn("no")).toBe(false)
    expect(isToggleOn(undefined)).toBe(false)
    expect(isToggleOn("")).toBe(false)
    expect(isToggleOn("0")).toBe(false)
  })
})
