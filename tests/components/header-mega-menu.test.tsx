import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const useHydratedProductCardMock = vi.hoisted(() => vi.fn())

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))
vi.mock("@/lib/products/use-hydrated-product-card", () => ({
  useHydratedProductCard: useHydratedProductCardMock,
}))

import { HeaderMegaMenu } from "@/components/layout/header-mega-menu"

describe("HeaderMegaMenu", () => {
  it("renders the category title, shared description, and view-all link", () => {
    useHydratedProductCardMock.mockReturnValue({ card: null })

    render(
      <HeaderMegaMenu
        categoryName="Parlantes"
        categoryHref="/catalog/parlantes"
        description="Descripción compartida de la tienda."
        viewAllText="Ver todos los productos"
        featuredProductId={null}
      />,
    )

    expect(screen.getByRole("heading", { name: "Parlantes" })).toBeInTheDocument()
    expect(screen.getByText("Descripción compartida de la tienda.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todos los productos" })).toHaveAttribute(
      "href",
      "/catalog/parlantes",
    )
  })

  it("renders the featured product with a struck-through compare-at price when discounted", () => {
    useHydratedProductCardMock.mockReturnValue({
      card: {
        id: "product-1",
        title: "Parlante Bluetooth",
        href: "/products/parlante-bluetooth",
        imageUrl: "/parlante.jpg",
        imageAlt: "Parlante Bluetooth",
        price: { amount: 90000, currencyCode: "COP", label: "$ 90.000", hasDiscount: true, compareAtLabel: "$ 120.000" },
        badges: [],
      },
    })

    render(
      <HeaderMegaMenu
        categoryName="Parlantes"
        categoryHref="/catalog/parlantes"
        description="Descripción compartida de la tienda."
        viewAllText="Ver todos los productos"
        featuredProductId="product-1"
      />,
    )

    const productLink = screen.getByRole("link", { name: /Parlante Bluetooth/ })
    expect(productLink).toHaveAttribute("href", "/products/parlante-bluetooth")
    expect(screen.getByText("$ 120.000")).toBeInTheDocument()
    expect(screen.getByText("$ 90.000")).toBeInTheDocument()
  })

  it("shows a loading skeleton while the featured product is still resolving", () => {
    useHydratedProductCardMock.mockReturnValue({ card: null, isLoading: true })

    render(
      <HeaderMegaMenu
        categoryName="Parlantes"
        categoryHref="/catalog/parlantes"
        description="Descripción compartida de la tienda."
        viewAllText="Ver todos los productos"
        featuredProductId="product-1"
      />,
    )

    expect(screen.getByTestId("mega-menu-skeleton")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Parlante/ })).not.toBeInTheDocument()
  })

  it("omits the featured panel when no product resolves, without crashing", () => {
    useHydratedProductCardMock.mockReturnValue({ card: null })

    render(
      <HeaderMegaMenu
        categoryName="Soportes"
        categoryHref="/catalog/soportes"
        description="Descripción compartida de la tienda."
        viewAllText="Ver todos los productos"
        featuredProductId={null}
      />,
    )

    expect(screen.queryByRole("link", { name: /Ver todos los productos/ })).toBeInTheDocument()
    expect(screen.queryAllByRole("link")).toHaveLength(1)
  })

  it("applies the editable panel and featured-product colors when provided", () => {
    useHydratedProductCardMock.mockReturnValue({
      card: {
        id: "product-1",
        title: "Parlante Bluetooth",
        href: "/products/parlante-bluetooth",
        imageUrl: "/parlante.jpg",
        imageAlt: "Parlante Bluetooth",
        price: { amount: 90000, currencyCode: "COP", label: "$ 90.000", hasDiscount: false },
        badges: [],
      },
    })

    render(
      <HeaderMegaMenu
        categoryName="Parlantes"
        categoryHref="/catalog/parlantes"
        description="Descripción compartida de la tienda."
        viewAllText="Ver todos los productos"
        featuredProductId="product-1"
        bgColor="#111111"
        textColor="#222222"
        featuredBgColor="#333333"
      />,
    )

    expect(screen.getByRole("heading", { name: "Parlantes" })).toHaveStyle({ color: "#222222" })
    expect(screen.getByRole("heading", { name: "Parlantes" }).closest("div.grid")).toHaveStyle({
      backgroundColor: "#111111",
    })
    expect(screen.getByRole("link", { name: /Parlante Bluetooth/ })).toHaveStyle({
      backgroundColor: "#333333",
    })
  })
})
