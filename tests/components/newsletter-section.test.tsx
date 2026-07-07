/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NewsletterSection, NEWSLETTER_DEFAULTS } from "@/components/sections/newsletter-section"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}))

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}))

describe("NewsletterSection colors", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
  })

  it("falls back to the theme's --sec-newsletter-button token when no color override is set", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<NewsletterSection />)

    const button = container.querySelector("button") as HTMLButtonElement
    expect(button.style.backgroundColor).toBe("var(--sec-newsletter-button, var(--primary))")
  })

  it("uses an explicit color override instead of the theme token", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, buttonColor: "#123456" },
    }))

    const { container } = render(<NewsletterSection />)

    const button = container.querySelector("button") as HTMLButtonElement
    expect(button.style.backgroundColor).toBe("rgb(18, 52, 86)")
  })

  it("keeps NEWSLETTER_DEFAULTS.buttonColor empty so it falls through to the theme token", () => {
    expect(NEWSLETTER_DEFAULTS.buttonColor).toBe("")
  })
})

describe("NewsletterSection structure", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))
  })

  it("sources the panel radius from --card-radius", () => {
    const { container } = render(<NewsletterSection />)

    const panel = container.querySelector('[data-component="newsletter"] > div') as HTMLElement
    expect(panel.className).toContain("rounded-card")
  })

  it("sources the email input and subscribe button radius from --button-radius so they follow the theme", () => {
    const { container } = render(<NewsletterSection />)

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement
    const button = container.querySelector("button") as HTMLButtonElement
    expect(emailInput.className).toContain("rounded-[var(--button-radius)]")
    expect(button.className).toContain("rounded-[var(--button-radius)]")
  })
})
