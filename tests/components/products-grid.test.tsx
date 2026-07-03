import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { ProductsGrid } from "@/components/sections/products-grid"
import type { CommerceProductCard } from "@/lib/types/products"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()

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

const speaker: CommerceProductCard = {
  id: "smart-speaker",
  title: "SmartSpeak Jessica",
  description: "Should not show up in this teaser grid",
  href: "/products/smartspeak-jessica",
  imageUrl: "/speaker.webp",
  imageAlt: "Smart speaker",
  category: "Speakers",
  price: {
    amount: 389000,
    currencyCode: "COP",
    label: "$ 389.000",
    compareAtAmount: 459000,
    compareAtLabel: "$ 459.000",
    hasDiscount: true,
  },
  badges: [],
  ctaLabel: "Ver detalles",
}

describe("ProductsGrid", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))
  })

  it("renders the product name, category, and price, with the image after the text (reference card order)", () => {
    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.getByText("SmartSpeak Jessica")).toBeInTheDocument()
    expect(screen.getByText("Speakers")).toBeInTheDocument()
    expect(screen.getByText("$ 389.000")).toBeInTheDocument()

    const order = Array.from(container.querySelectorAll("h3, img")).map((el) => el.tagName)
    expect(order).toEqual(["H3", "IMG"])
  })

  it("does not render the product description or a dedicated CTA button, since the whole card already links to the product", () => {
    render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.queryByText("Should not show up in this teaser grid")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /ver detalles/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /^ver detalles$/i })).not.toBeInTheDocument()
  })

  it("still links to the product through the title and image", () => {
    render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.getByRole("link", { name: "SmartSpeak Jessica" })).toHaveAttribute(
      "href",
      "/products/smartspeak-jessica",
    )
    expect(screen.getByRole("link", { name: /ver smartspeak jessica/i })).toHaveAttribute(
      "href",
      "/products/smartspeak-jessica",
    )
  })

  it("uses the 4-column class by default", () => {
    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const grid = container.querySelector('[class*="grid-cols-1"]')
    expect(grid).toHaveClass("sm:grid-cols-2", "lg:grid-cols-4")
  })

  it("uses a 2-column class when columns is '2'", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, columns: "2" },
    }))

    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const grid = container.querySelector('[class*="grid-cols-1"]')
    expect(grid).toHaveClass("sm:grid-cols-2")
    expect(grid).not.toHaveClass("lg:grid-cols-4")
  })

  it("uses a 3-column class when columns is '3'", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, columns: "3" },
    }))

    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const grid = container.querySelector('[class*="grid-cols-1"]')
    expect(grid).toHaveClass("lg:grid-cols-3")
    expect(grid).not.toHaveClass("lg:grid-cols-4")
  })

  it("applies the configured card background and price color to each card", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, cardBgColor: "#f2f2f2", priceColor: "#1e354e" },
    }))

    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const article = container.querySelector("article")
    expect(article).toHaveStyle({ backgroundColor: "#f2f2f2" })
    expect(screen.getByText("$ 389.000")).toHaveStyle({ color: "#1e354e" })
  })

  it("hides the category when showCategory is 'no'", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, showCategory: "no" },
    }))

    render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.queryByText("Speakers")).not.toBeInTheDocument()
  })

  it("hides the price when showPrice is 'no'", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, showPrice: "no" },
    }))

    render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.queryByText("$ 389.000")).not.toBeInTheDocument()
  })
})
