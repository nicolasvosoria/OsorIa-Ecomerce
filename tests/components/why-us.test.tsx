/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WhyUs, WHYUS_DEFAULTS } from "@/components/sections/why-us"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}))

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}))

describe("WhyUs colors", () => {
  it("falls back to the global theme tokens when no color override is set", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<WhyUs />)

    const section = container.querySelector('[data-component="whyus"]') as HTMLElement
    expect(section.style.backgroundColor).toBe("var(--muted)")

    const heading = container.querySelector("h2") as HTMLElement
    expect(heading.style.color).toBe("var(--foreground)")

    const card = container.querySelector('[data-component="whyus"] .grid > div') as HTMLElement
    expect(card.style.backgroundColor).toBe("var(--card)")

    const iconChip = card.querySelector("div") as HTMLElement
    expect(iconChip.style.backgroundColor).toBe("var(--muted)")

    const icon = iconChip.querySelector("svg") as unknown as HTMLElement
    expect(icon.style.color).toBe("var(--foreground)")

    const itemTitle = card.querySelector("h3") as HTMLElement
    expect(itemTitle.style.color).toBe("var(--foreground)")

    const itemSubtitle = card.querySelector("p") as HTMLElement
    expect(itemSubtitle.style.color).toBe("var(--muted-foreground)")
  })

  it("uses an explicit color override instead of the theme token", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, sectionBgColor: "#123456", cardBgColor: "#abcdef" },
    }))

    const { container } = render(<WhyUs />)

    const section = container.querySelector('[data-component="whyus"]') as HTMLElement
    expect(section.style.backgroundColor).toBe("rgb(18, 52, 86)")

    const card = container.querySelector('[data-component="whyus"] .grid > div') as HTMLElement
    expect(card.style.backgroundColor).toBe("rgb(171, 205, 239)")
  })

  it("keeps WHYUS_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(WHYUS_DEFAULTS.sectionBgColor).toBe("")
    expect(WHYUS_DEFAULTS.cardBgColor).toBe("")
    expect(WHYUS_DEFAULTS.iconBgColor).toBe("")
    expect(WHYUS_DEFAULTS.iconColor).toBe("")
    expect(WHYUS_DEFAULTS.titleColor).toBe("")
    expect(WHYUS_DEFAULTS.subtitleColor).toBe("")
  })
})

describe("WhyUs structure", () => {
  it("sources the card radius, shadow and border from theme tokens", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<WhyUs />)

    const card = container.querySelector('[data-component="whyus"] .grid > div') as HTMLElement
    expect(card.className).toContain("rounded-[var(--card-radius,1.5rem)]")
    expect(card.className).toContain("shadow-[var(--shadow-card,none)]")
    expect(card.className).toContain("border-[var(--border)]")
  })
})
