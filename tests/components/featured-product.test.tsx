/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { FeaturedProduct, FEATURED_DEFAULTS } from "@/components/sections/featured-product"
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

const featuredCard: CommerceProductCard = {
  id: "item-1",
  title: "BePhones XTR4 earphones",
  href: "/products/bephones-xtr4",
  imageUrl: "/bephones.webp",
  imageAlt: "BePhones XTR4 earphones",
  category: "Earphones",
  price: {
    amount: 79000,
    currencyCode: "COP",
    label: "$79.00",
    hasDiscount: false,
  },
  badges: [],
}

describe("FeaturedProduct colors", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map(), isEditMode: false })
    mockUseHydratedProductCard.mockReturnValue({ card: featuredCard, isLoading: false })
  })

  it("falls back to the theme's --sec-featured-* tokens when no color override is set", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<FeaturedProduct />)

    const section = container.querySelector('[data-component="featured"]') as HTMLElement
    expect(section.style.backgroundColor).toBe("var(--sec-featured-bg, var(--secondary))")
    expect(section.style.color).toBe("var(--sec-featured-text, var(--secondary-foreground))")

    const card = container.querySelector("a > div") as HTMLElement
    expect(card.style.backgroundColor).toBe("var(--sec-featured-card-bg, var(--card))")
  })

  it("uses an explicit color override instead of the theme token", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, bgColor: "#123456", cardBgColor: "#abcdef" },
    }))

    const { container } = render(<FeaturedProduct />)

    const section = container.querySelector('[data-component="featured"]') as HTMLElement
    expect(section.style.backgroundColor).toBe("rgb(18, 52, 86)")

    const card = container.querySelector("a > div") as HTMLElement
    expect(card.style.backgroundColor).toBe("rgb(171, 205, 239)")
  })

  it("keeps FEATURED_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(FEATURED_DEFAULTS.bgColor).toBe("")
    expect(FEATURED_DEFAULTS.textColor).toBe("")
    expect(FEATURED_DEFAULTS.cardBgColor).toBe("")
    expect(FEATURED_DEFAULTS.productBgColor).toBe("")
  })
})

describe("FeaturedProduct structure", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map(), isEditMode: false })
    mockUseHydratedProductCard.mockReturnValue({ card: featuredCard, isLoading: false })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))
  })

  it("sources the panel and card radius from --card-radius", () => {
    const { container } = render(<FeaturedProduct />)

    const section = container.querySelector('[data-component="featured"]') as HTMLElement
    expect(section.className).toContain("rounded-card")

    const card = container.querySelector("a > div") as HTMLElement
    expect(card.className).toContain("rounded-card")
  })

  it("sources the card shadow from --shadow-card/--shadow-elevated", () => {
    const { container } = render(<FeaturedProduct />)

    const card = container.querySelector("a > div") as HTMLElement
    expect(card.className).toContain("shadow-[var(--shadow-card,none)]")
    expect(card.className).toContain("hover:shadow-[var(--shadow-elevated,none)]")
  })

  it("sources the card border color from var(--border)", () => {
    const { container } = render(<FeaturedProduct />)

    const card = container.querySelector("a > div") as HTMLElement
    expect(card.className).toContain("border-[var(--border)]")
  })

  it("sources the inner product-image container radius from --card-radius", () => {
    const { container } = render(<FeaturedProduct />)

    const productImageBox = container.querySelector(".aspect-square") as HTMLElement
    expect(productImageBox.className).toContain("rounded-card")
  })
})
