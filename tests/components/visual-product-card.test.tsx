import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { VisualProductCard } from "@/components/products/visual-product-card"
import type { CommerceProductCard } from "@/lib/types/products"

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const discountedProduct: CommerceProductCard = {
  id: "smart-speaker",
  title: "SmartSpeak Jessica",
  description: "Reference speaker",
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
    savingsLabel: "Ahorra $ 70.000 (15%)",
    discountPercent: 15,
    hasDiscount: true,
  },
  badges: [],
  ctaLabel: "Ver detalles",
}

describe("VisualProductCard", () => {
  it("matches the reference's discount treatment: strikethrough original price first, sale price after, no percentage badge", () => {
    const { container } = render(<VisualProductCard product={discountedProduct} />)

    expect(screen.getByRole("link", { name: /ver smartspeak jessica/i })).toHaveAttribute("href", "/products/smartspeak-jessica")
    expect(screen.getByText("$ 389.000")).toBeInTheDocument()
    expect(screen.getByText("$ 459.000")).toBeInTheDocument()
    expect(screen.queryByText("Ahorra $ 70.000 (15%)")).not.toBeInTheDocument()
    expect(screen.queryByText(/^-?\d+%$/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ver detalles/i })).toHaveAttribute("href", "/products/smartspeak-jessica")

    const text = container.textContent || ""
    expect(text.indexOf("459.000")).toBeLessThan(text.indexOf("389.000"))
  })

  it("renders the product name before the category caption, matching the reference's card order", () => {
    const { container } = render(<VisualProductCard product={discountedProduct} />)

    const text = container.textContent || ""
    expect(text.indexOf("SmartSpeak Jessica")).toBeLessThan(text.indexOf("Speakers"))
  })

  it("hides the description when showDescription is false, for the compact homepage teaser grid", () => {
    render(<VisualProductCard product={discountedProduct} showDescription={false} />)

    expect(screen.queryByText("Reference speaker")).not.toBeInTheDocument()
  })

  it("shows the description by default, for the full catalog grid", () => {
    render(<VisualProductCard product={discountedProduct} />)

    expect(screen.getByText("Reference speaker")).toBeInTheDocument()
  })

  it("still renders a combo badge when present", () => {
    render(<VisualProductCard product={{ ...discountedProduct, badges: [{ label: "Combo", tone: "combo" }] }} />)

    expect(screen.getByText("Combo")).toBeInTheDocument()
  })

  it("renders image first by default (catalog grid), matching the previous behavior", () => {
    const { container } = render(<VisualProductCard product={discountedProduct} />)

    const order = Array.from(container.querySelectorAll("img, h3")).map((el) => el.tagName)
    expect(order).toEqual(["IMG", "H3"])
  })

  it("renders text before the image when mediaPosition is 'bottom', matching the reference's Popular Products card", () => {
    const { container } = render(<VisualProductCard product={discountedProduct} mediaPosition="bottom" />)

    const order = Array.from(container.querySelectorAll("img, h3")).map((el) => el.tagName)
    expect(order).toEqual(["H3", "IMG"])
  })

  it("falls back to an accessible empty image state when tenant image fails", () => {
    render(<VisualProductCard product={discountedProduct} />)

    fireEvent.error(screen.getByRole("img", { name: /smart speaker/i }))

    expect(screen.getByRole("img", { name: /sin imagen para smartspeak jessica/i })).toBeInTheDocument()
  })

  it("uses bg-muted and bg-background by default (unchanged catalog behavior)", () => {
    const { container } = render(<VisualProductCard product={discountedProduct} />)

    expect(container.querySelector("article")).toHaveClass("bg-muted")
    expect(container.querySelector("article")?.getAttribute("style")).toBeNull()
  })

  it("applies cardBackground as inline style and drops the bg-muted class", () => {
    const { container } = render(
      <VisualProductCard product={discountedProduct} cardBackground="#f2f2f2" />,
    )

    const article = container.querySelector("article")
    expect(article).not.toHaveClass("bg-muted")
    expect(article).toHaveStyle({ backgroundColor: "#f2f2f2" })
  })

  it("applies priceColor as inline style and drops the text-primary class", () => {
    render(<VisualProductCard product={discountedProduct} priceColor="#1e354e" />)

    const price = screen.getByText("$ 389.000")
    expect(price).not.toHaveClass("text-primary")
    expect(price).toHaveStyle({ color: "#1e354e" })
  })

  it("makes the media container transparent when imageBlendsWithCard is true", () => {
    const { container } = render(
      <VisualProductCard product={discountedProduct} imageBlendsWithCard />,
    )

    const mediaContainer = container.querySelector("img")?.closest("div.aspect-square")
    expect(mediaContainer).not.toHaveClass("bg-background")
  })

  it("hides the category when showCategory is false", () => {
    render(<VisualProductCard product={discountedProduct} showCategory={false} />)

    expect(screen.queryByText("Speakers")).not.toBeInTheDocument()
  })

  it("hides the price block when showPrice is false", () => {
    render(<VisualProductCard product={discountedProduct} showPrice={false} />)

    expect(screen.queryByText("$ 389.000")).not.toBeInTheDocument()
    expect(screen.queryByText("$ 459.000")).not.toBeInTheDocument()
  })
})
