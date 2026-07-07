/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { SpecialOffer, SPECIAL_OFFER_DEFAULTS } from "@/components/sections/special-offer"
import type { CommerceProductCard } from "@/lib/types/products"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()
const mockUseHydratedProductCard = vi.fn()

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}))

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}))

vi.mock("@/lib/products/use-hydrated-product-card", () => ({
  useHydratedProductCard: (...args: unknown[]) => mockUseHydratedProductCard(...args),
}))

const offerCard: CommerceProductCard = {
  id: "item-1",
  title: "W00DY CX700",
  href: "/products/w00dy-cx700",
  imageUrl: "/w00dy-cx700.webp",
  imageAlt: "W00DY CX700",
  category: "Electrónica",
  price: {
    amount: 69900,
    currencyCode: "COP",
    label: "$699.00",
    hasDiscount: false,
  },
  badges: [],
}

function findByBackgroundColor(container: HTMLElement, value: string): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>("div")).find(
    (element) => element.style.backgroundColor === value,
  )
}

describe("SpecialOffer colors", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map(), isEditMode: false })
    mockUseHydratedProductCard.mockReturnValue({ card: offerCard, isLoading: false })
  })

  it("falls back to the theme's --sec-specialOffer-* tokens when no color override is set", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<SpecialOffer />)

    const section = container.querySelector('[data-component="specialOffer"]') as HTMLElement
    expect(section.style.backgroundColor).toBe(
      "var(--sec-specialOffer-section-bg, var(--background))",
    )

    const panel = container.querySelector('[data-component="specialOffer"] > div') as HTMLElement
    expect(panel.style.backgroundColor).toBe("var(--sec-specialOffer-bg, var(--secondary))")
    expect(panel.style.color).toBe("var(--sec-specialOffer-text, var(--secondary-foreground))")

    const productBox = findByBackgroundColor(
      container,
      "var(--sec-specialOffer-product-bg, var(--muted))",
    )
    expect(productBox).toBeDefined()
  })

  it("uses an explicit color override instead of the theme token", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        bgColor: "#123456",
        textColor: "#abcdef",
        productBgColor: "#654321",
        accentColor: "#0f0f0f",
        sectionBgColor: "#0f172a",
      },
    }))

    const { container } = render(<SpecialOffer />)

    const section = container.querySelector('[data-component="specialOffer"]') as HTMLElement
    expect(section.style.backgroundColor).toBe("rgb(15, 23, 42)")

    const panel = container.querySelector('[data-component="specialOffer"] > div') as HTMLElement
    expect(panel.style.backgroundColor).toBe("rgb(18, 52, 86)")
    expect(panel.style.color).toBe("rgb(171, 205, 239)")

    const productBox = findByBackgroundColor(container, "rgb(101, 67, 33)")
    expect(productBox).toBeDefined()
  })

  it("keeps SPECIAL_OFFER_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(SPECIAL_OFFER_DEFAULTS.bgColor).toBe("")
    expect(SPECIAL_OFFER_DEFAULTS.accentColor).toBe("")
    expect(SPECIAL_OFFER_DEFAULTS.productBgColor).toBe("")
    expect(SPECIAL_OFFER_DEFAULTS.textColor).toBe("")
    expect(SPECIAL_OFFER_DEFAULTS.sectionBgColor).toBe("")
  })
})

describe("SpecialOffer structure", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map(), isEditMode: false })
    mockUseHydratedProductCard.mockReturnValue({ card: offerCard, isLoading: false })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))
  })

  it("sources the panel radius from --card-radius", () => {
    const { container } = render(<SpecialOffer />)

    const panel = container.querySelector('[data-component="specialOffer"] > div') as HTMLElement
    expect(panel.className).toContain("rounded-card")
  })

  it("sources the product image card and CTA button radius from theme tokens", () => {
    const { container } = render(<SpecialOffer />)

    const productBox = findByBackgroundColor(
      container,
      "var(--sec-specialOffer-product-bg, var(--muted))",
    )
    expect(productBox?.className).toContain("rounded-card")

    const ctaLink = container.querySelector(`a[href="${offerCard.href}"]`) as HTMLAnchorElement
    expect(ctaLink.className).toContain("rounded-[var(--button-radius)]")
  })
})
