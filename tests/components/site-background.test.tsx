/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SiteBackground } from "@/components/site-background"

const mockUseComponentStyle = vi.fn()

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}))

describe("SiteBackground", () => {
  beforeEach(() => {
    document.documentElement.style.setProperty("--background", "#0d1117")
  })

  afterEach(() => {
    document.documentElement.style.removeProperty("--background")
    document.body.style.backgroundColor = ""
  })

  it("falls back to the theme's --background token when no color override is set", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    render(<SiteBackground />)

    expect(document.body.style.backgroundColor).toBe("rgb(13, 17, 23)")
  })

  it("uses an explicit color override instead of the theme token", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, backgroundColor: "#123456" },
    }))

    render(<SiteBackground />)

    expect(document.body.style.backgroundColor).toBe("rgb(18, 52, 86)")
  })
})
