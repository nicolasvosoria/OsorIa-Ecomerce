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
    expect(section.style.backgroundColor).toBe("var(--sec-whyus-section-bg,var(--muted))")

    const heading = container.querySelector("h2") as HTMLElement
    expect(heading.style.color).toBe("var(--sec-whyus-title,var(--foreground))")

    const card = container.querySelector('[data-component="whyus"] .grid > div') as HTMLElement
    expect(card.style.backgroundColor).toBe("var(--sec-whyus-card-bg,var(--card))")

    const iconChip = card.querySelector("div") as HTMLElement
    expect(iconChip.style.backgroundColor).toBe("var(--sec-whyus-icon-bg,var(--muted))")

    const icon = iconChip.querySelector("svg") as unknown as HTMLElement
    expect(icon.style.color).toBe("var(--sec-whyus-icon,var(--foreground))")

    const itemTitle = card.querySelector("h3") as HTMLElement
    expect(itemTitle.style.color).toBe("var(--sec-whyus-title,var(--foreground))")

    const itemSubtitle = card.querySelector("p") as HTMLElement
    expect(itemSubtitle.style.color).toBe("var(--sec-whyus-subtitle,var(--muted-foreground))")
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
    expect(card.className).toContain("rounded-card")
    expect(card.className).toContain("shadow-[var(--shadow-card,none)]")
    expect(card.className).toContain("border-[var(--border)]")
  })
})

describe("WhyUs design options", () => {
  it("defaults reproduce today's look: 4 columns, left-aligned cards, top rounded-xl icon, cards format", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<WhyUs />)

    const grid = container.querySelector('[data-component="whyus"] .grid') as HTMLElement
    expect(grid.className).toContain("grid-cols-2")
    expect(grid.className).toContain("md:grid-cols-4")

    const card = grid.querySelector(":scope > div") as HTMLElement
    expect(card.className).toContain("flex-col")
    expect(card.className).toContain("items-start")
    expect(card.className).toContain("text-left")

    const iconChip = card.querySelector("div") as HTMLElement
    expect(iconChip.className).toContain("rounded-xl")
    expect(iconChip.style.backgroundColor).toBe("var(--sec-whyus-icon-bg,var(--muted))")

    expect(container.querySelector('[data-testid="whyus-bar"]')).toBeNull()
  })

  it("applies columns=3", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, columns: "3" },
    }))

    const { container } = render(<WhyUs />)

    const grid = container.querySelector('[data-component="whyus"] .grid') as HTMLElement
    expect(grid.className).toContain("md:grid-cols-3")
    expect(grid.className).not.toContain("md:grid-cols-4")
  })

  it("applies iconStyle=circle (rounded-full) and iconStyle=plain (no background)", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, iconStyle: "circle" },
    }))

    const { container: circleContainer } = render(<WhyUs />)
    const circleIcon = circleContainer.querySelector(
      '[data-component="whyus"] .grid > div > div',
    ) as HTMLElement
    expect(circleIcon.className).toContain("rounded-full")

    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, iconStyle: "plain" },
    }))

    const { container: plainContainer } = render(<WhyUs />)
    const plainIcon = plainContainer.querySelector(
      '[data-component="whyus"] .grid > div > div',
    ) as HTMLElement
    expect(plainIcon.className).not.toContain("rounded-xl")
    expect(plainIcon.className).not.toContain("rounded-full")
    expect(plainIcon.style.backgroundColor).toBe("")
  })

  it("applies contentAlign=center", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, contentAlign: "center" },
    }))

    const { container } = render(<WhyUs />)
    const card = container.querySelector('[data-component="whyus"] .grid > div') as HTMLElement
    expect(card.className).toContain("items-center")
    expect(card.className).toContain("text-center")
  })

  it("applies iconPosition=side (stacked on mobile/tablet, row layout only at lg)", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, iconPosition: "side" },
    }))

    const { container } = render(<WhyUs />)
    const card = container.querySelector('[data-component="whyus"] .grid > div') as HTMLElement
    expect(card.className).toContain("flex-col")
    expect(card.className).toContain("lg:flex-row")
  })

  it("renders the compact bar (not the card grid) when layoutFormat=bar", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, layoutFormat: "bar" },
    }))

    const { container } = render(<WhyUs />)

    expect(container.querySelector('[data-testid="whyus-bar"]')).not.toBeNull()
    expect(container.querySelector('[data-component="whyus"] .grid')).toBeNull()
  })

  it("bar respects contentAlign=center by changing the justification (not the default md:justify-between)", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, layoutFormat: "bar", contentAlign: "center" },
    }))

    const { container } = render(<WhyUs />)
    const bar = container.querySelector('[data-testid="whyus-bar"]') as HTMLElement
    expect(bar.className).toContain("md:justify-center")
    expect(bar.className).not.toContain("md:justify-between")
  })

  it("bar shows the item description with subtitleColor", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, layoutFormat: "bar", subtitleColor: "#654321" },
    }))

    const { container } = render(<WhyUs />)
    const bar = container.querySelector('[data-testid="whyus-bar"]') as HTMLElement
    const description = bar.querySelector("span:nth-of-type(2)") as HTMLElement
    expect(description.textContent).toBe(WHYUS_DEFAULTS.items[0].description)
    expect(description.style.color).toBe("rgb(101, 67, 33)")
  })
})

describe("WhyUs item link", () => {
  it("renders a card item without a link as a plain div (no regression)", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<WhyUs />)
    const card = container.querySelector('[data-component="whyus"] .grid > div') as HTMLElement
    expect(card).not.toBeNull()
    expect(container.querySelector('[data-component="whyus"] .grid a')).toBeNull()
  })

  it("wraps a card item in an <a> with target/rel set for an external link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        items: [{ ...WHYUS_DEFAULTS.items[0], link: "https://example.com" }],
      },
    }))

    const { container } = render(<WhyUs />)
    const link = container.querySelector('[data-component="whyus"] .grid > a') as HTMLElement

    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("wraps a card item in a Next Link (no target/rel) for an internal link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        items: [{ ...WHYUS_DEFAULTS.items[0], link: "/nosotros" }],
      },
    }))

    const { container } = render(<WhyUs />)
    const link = container.querySelector('[data-component="whyus"] .grid > a') as HTMLElement

    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "/nosotros")
    expect(link).not.toHaveAttribute("target")
    expect(link).not.toHaveAttribute("rel")
  })

  it("renders a bar item without a link as a plain div, and with a link as an <a>", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        layoutFormat: "bar",
        items: [
          WHYUS_DEFAULTS.items[0],
          { ...WHYUS_DEFAULTS.items[1], link: "https://example.com" },
        ],
      },
    }))

    const { container } = render(<WhyUs />)
    const bar = container.querySelector('[data-testid="whyus-bar"]') as HTMLElement

    expect(bar.querySelectorAll(":scope > div").length).toBe(1)
    const link = bar.querySelector(":scope > a") as HTMLElement
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("target", "_blank")
  })
})
