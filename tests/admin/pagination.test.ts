import { describe, expect, it } from "vitest"

import { DEFAULT_PAGE_SIZE, parsePositiveInt } from "@/lib/admin/pagination"

describe("parsePositiveInt", () => {
  it("parses a valid positive integer string", () => {
    expect(parsePositiveInt("3", 1)).toBe(3)
  })

  it("falls back when the value is undefined", () => {
    expect(parsePositiveInt(undefined, 20)).toBe(20)
  })

  it("falls back when the value is an empty string", () => {
    expect(parsePositiveInt("", 20)).toBe(20)
  })

  it("falls back when the value is zero", () => {
    expect(parsePositiveInt("0", 20)).toBe(20)
  })

  it("falls back when the value is negative", () => {
    expect(parsePositiveInt("-5", 20)).toBe(20)
  })

  it("falls back when the value is not numeric", () => {
    expect(parsePositiveInt("abc", 20)).toBe(20)
  })

  it("falls back when the value is a decimal", () => {
    expect(parsePositiveInt("1.5", 20)).toBe(20)
  })

  it("falls back when the value has trailing non-numeric characters", () => {
    expect(parsePositiveInt("3px", 20)).toBe(20)
  })
})

describe("DEFAULT_PAGE_SIZE", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(DEFAULT_PAGE_SIZE)).toBe(true)
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0)
  })
})
