import { describe, expect, it } from "vitest"
import { DEFAULT_HOME_COMPOSITION, resolveHomeComposition } from "@/lib/sections/home-composition"

describe("resolveHomeComposition", () => {
  it("returns the default composition (today's home order) for null, undefined, or a non-array value — no saved row means no customization", () => {
    expect(resolveHomeComposition(null)).toEqual(DEFAULT_HOME_COMPOSITION)
    expect(resolveHomeComposition(undefined)).toEqual(DEFAULT_HOME_COMPOSITION)
    expect(resolveHomeComposition("not-an-array")).toEqual(DEFAULT_HOME_COMPOSITION)
    expect(resolveHomeComposition({ hero: true })).toEqual(DEFAULT_HOME_COMPOSITION)
  })

  it("returns an empty array as-is for a saved empty array — a saved empty composition is authoritative, not a fallback to default", () => {
    expect(resolveHomeComposition([])).toEqual([])
  })

  it("returns a fresh copy each time, not a shared reference", () => {
    const first = resolveHomeComposition(null)
    first[0].enabled = false
    expect(DEFAULT_HOME_COMPOSITION[0].enabled).toBe(true)
    expect(resolveHomeComposition(null)[0].enabled).toBe(true)
  })

  it("returns a partial saved composition as-is, preserving order, without appending missing defaults", () => {
    const result = resolveHomeComposition([
      { key: "newsletter", enabled: true },
      { key: "hero", enabled: false },
    ])

    expect(result.map((entry) => entry.key)).toEqual(["newsletter", "hero"])
    expect(result.find((entry) => entry.key === "hero")?.enabled).toBe(false)
  })

  it("keeps a removed section out of the resolved composition (the saved composition is authoritative)", () => {
    const result = resolveHomeComposition([
      { key: "popular", enabled: true },
      { key: "products", enabled: true },
    ])

    expect(result.map((entry) => entry.key)).toEqual(["popular", "products"])
    expect(result.some((entry) => entry.key === "hero")).toBe(false)
  })

  it("drops an entry whose key is not a composable section", () => {
    const result = resolveHomeComposition([
      { key: "hero", enabled: true },
      { key: "footer", enabled: true },
      { key: "unknownSection", enabled: true },
    ])

    expect(result.some((entry) => entry.key === "footer")).toBe(false)
    expect(result.some((entry) => entry.key === "unknownSection")).toBe(false)
  })

  it("keeps only the first occurrence of a duplicate key", () => {
    const result = resolveHomeComposition([
      { key: "hero", enabled: false },
      { key: "hero", enabled: true },
    ])

    expect(result.filter((entry) => entry.key === "hero")).toHaveLength(1)
    expect(result.find((entry) => entry.key === "hero")?.enabled).toBe(false)
  })

  it("coerces a missing or non-boolean enabled to true", () => {
    const result = resolveHomeComposition([
      { key: "hero" },
      { key: "products", enabled: "si" },
      { key: "featured", enabled: 0 },
    ])

    expect(result.find((entry) => entry.key === "hero")?.enabled).toBe(true)
    expect(result.find((entry) => entry.key === "products")?.enabled).toBe(true)
    expect(result.find((entry) => entry.key === "featured")?.enabled).toBe(true)
  })

  it("preserves a real false for enabled", () => {
    const result = resolveHomeComposition([{ key: "hero", enabled: false }])
    expect(result.find((entry) => entry.key === "hero")?.enabled).toBe(false)
  })
})
