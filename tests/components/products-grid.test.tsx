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

  it("applies the configured price color to each card", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, priceColor: "#1e354e" },
    }))

    render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.getByText("$ 389.000")).toHaveStyle({ color: "#1e354e" })
  })

  it("falls back to the theme's --sec-products-bg token when bgColor is empty", () => {
    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const section = container.querySelector('section[data-component="products"]')
    expect(section).toHaveStyle({ backgroundColor: "var(--sec-products-bg,transparent)" })
  })

  it("applies a configured bgColor as the section's inline background", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, bgColor: "#123456" },
    }))

    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const section = container.querySelector('section[data-component="products"]')
    expect(section).toHaveStyle({ backgroundColor: "rgb(18, 52, 86)" })
  })

  it("falls back to the theme's --sec-products-text token for the heading when textColor is empty", () => {
    render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.getByText("Productos populares")).toHaveStyle({
      color: "var(--sec-products-text,var(--foreground))",
    })
  })

  it("uses a configured textColor for the heading instead of the theme fallback", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, textColor: "#1e354e" },
    }))

    render(<ProductsGrid initialProducts={[speaker]} />)

    expect(screen.getByText("Productos populares")).toHaveStyle({ color: "#1e354e" })
  })

  it("falls back to the theme's --sec-products-price token when priceColor is empty", () => {
    render(<ProductsGrid initialProducts={[speaker]} />)

    const price = screen.getByText("$ 389.000")
    expect(price).toHaveStyle({ color: "var(--sec-products-price,var(--primary))" })
    expect(price).not.toHaveClass("text-primary")
  })

  it("falls back to the theme's --sec-products-* tokens for card background and corner radius", () => {
    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const article = container.querySelector("article")
    expect(article).toHaveStyle({ backgroundColor: "var(--sec-products-card-bg,var(--muted))" })
    expect(article).not.toHaveClass("bg-muted")
    expect(article).toHaveClass(
      "rounded-[var(--sec-products-corner-radius,var(--card-radius,1.5rem))]",
    )
  })

  it("overrides the theme's card background and corner radius when they are set per section", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, cardBgColor: "#f2f2f2", cornerRadius: "xl" },
    }))

    const { container } = render(<ProductsGrid initialProducts={[speaker]} />)

    const article = container.querySelector("article")
    expect(article).toHaveStyle({ backgroundColor: "#f2f2f2" })
    expect(article).not.toHaveClass("bg-muted")
    expect(article).toHaveClass("rounded-3xl")
    expect(article).not.toHaveClass("rounded-[var(--card-radius,1.5rem)]")
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
