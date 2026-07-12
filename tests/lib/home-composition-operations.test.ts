import { describe, expect, it } from "vitest"
import {
  addSectionEntry,
  removeSectionEntry,
  reorderSectionEntries,
  toggleSectionEnabled,
} from "@/lib/section-editor/home-composition-operations"
import type { HomeSectionEntry } from "@/lib/supabase/types"

const entries: HomeSectionEntry[] = [
  { key: "hero", enabled: true },
  { key: "popular", enabled: true },
  { key: "products", enabled: false },
]

describe("reorderSectionEntries", () => {
  it("moves the active entry to the position of the target entry", () => {
    const result = reorderSectionEntries(entries, "hero", "products")
    expect(result.map((entry) => entry.key)).toEqual(["popular", "products", "hero"])
  })

  it("returns the same list unchanged when active and target keys match", () => {
    expect(reorderSectionEntries(entries, "hero", "hero")).toBe(entries)
  })

  it("returns the original list when either key is unknown", () => {
    expect(reorderSectionEntries(entries, "missing", "hero")).toBe(entries)
    expect(reorderSectionEntries(entries, "hero", "missing")).toBe(entries)
  })
})

describe("toggleSectionEnabled", () => {
  it("flips only the matching entry's enabled flag", () => {
    const result = toggleSectionEnabled(entries, "popular")
    expect(result.find((entry) => entry.key === "popular")?.enabled).toBe(false)
    expect(result.find((entry) => entry.key === "hero")?.enabled).toBe(true)
  })
})

describe("removeSectionEntry", () => {
  it("drops the matching entry and keeps the rest in order", () => {
    const result = removeSectionEntry(entries, "popular")
    expect(result.map((entry) => entry.key)).toEqual(["hero", "products"])
  })
})

describe("addSectionEntry", () => {
  it("appends a missing composable key as enabled", () => {
    const result = addSectionEntry(entries, "whyus")
    expect(result.map((entry) => entry.key)).toEqual(["hero", "popular", "products", "whyus"])
    expect(result[3]).toEqual({ key: "whyus", enabled: true })
  })

  it("is a no-op when the key is already present", () => {
    expect(addSectionEntry(entries, "hero")).toBe(entries)
  })

  it("is a no-op for a non-composable/unknown key", () => {
    expect(addSectionEntry(entries, "not-a-real-section")).toBe(entries)
  })

  it("does not mutate the input list", () => {
    const original = [...entries]
    addSectionEntry(entries, "whyus")
    expect(entries).toEqual(original)
  })
})
