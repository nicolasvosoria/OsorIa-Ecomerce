import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { PopularItems, POPULAR_DEFAULTS } from "@/components/sections/popular-items"
import type { PopularCategoryTile } from "@/lib/products/popular-sections"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()
const { getPopularCategoryTilesMock } = vi.hoisted(() => ({
  getPopularCategoryTilesMock: vi.fn(),
}))

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

vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({ t: { wishlist: { viewDetails: "Ver detalles" } } }),
}))

vi.mock("@/lib/products/popular-sections", () => ({
  getPopularCategoryTiles: getPopularCategoryTilesMock,
}))

const speakerTile: PopularCategoryTile = {
  id: "cat-speakers",
  name: "Bocinas Bluetooth",
  slug: "bocinas-bluetooth",
  imageUrl: "/speakers.webp",
  startingPriceLabel: "Desde $ 356.000",
  startingPriceAmount: 356000,
  href: "/catalog/bocinas-bluetooth",
}

const earphonesTile: PopularCategoryTile = {
  id: "cat-earphones",
  name: "Auriculares y Audífonos",
  slug: "auriculares-y-audifonos",
  startingPriceLabel: "Desde $ 29.000",
  startingPriceAmount: 29000,
  href: "/catalog/auriculares-y-audifonos",
}

describe("PopularItems", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))
    getPopularCategoryTilesMock.mockReset()
  })

  it("renders one tile per category with name, starting price, and a link to its catalog page (live path)", () => {
    render(<PopularItems initialTiles={[speakerTile, earphonesTile]} />)

    expect(screen.getByText("Bocinas Bluetooth")).toBeInTheDocument()
    expect(screen.getByText("Desde $ 356.000")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /bocinas bluetooth/i })).toHaveAttribute(
      "href",
      "/catalog/bocinas-bluetooth",
    )
    expect(screen.getByRole("link", { name: /auriculares y audífonos/i })).toHaveAttribute(
      "href",
      "/catalog/auriculares-y-audifonos",
    )
  })

  it("does not render any product title from the products-grid pool, since items here are categories", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    expect(screen.queryByText("BeShow Volcano")).not.toBeInTheDocument()
  })

  it("shows a header price label derived from the cheapest tile, matching the reference's single 'Starting at' headline", () => {
    render(<PopularItems initialTiles={[speakerTile, earphonesTile]} />)

    expect(screen.getByTestId("popular-items-starting-price")).toHaveTextContent("Desde $ 29.000")
  })

  it("falls back to fetching the same category tiles itself when no initialTiles prop is given (editor preview path)", async () => {
    getPopularCategoryTilesMock.mockResolvedValue([speakerTile])

    render(<PopularItems />)

    await waitFor(() => expect(screen.getByText("Bocinas Bluetooth")).toBeInTheDocument())
    expect(getPopularCategoryTilesMock).toHaveBeenCalledTimes(1)
  })

  it("shows an accessible empty-image placeholder when a category has no image", () => {
    render(<PopularItems initialTiles={[earphonesTile]} />)

    expect(screen.getByRole("img", { name: /sin imagen para auriculares y audífonos/i })).toBeInTheDocument()
  })

  it("falls back to the theme's --sec-popular-button token when no color override is set", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    const button = screen.getByText("Ver detalles")
    expect(button).toHaveStyle({ backgroundColor: "var(--sec-popular-button)" })
  })

  it("uses an explicit buttonColor override instead of the theme token", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, buttonColor: "#123456" },
    }))

    render(<PopularItems initialTiles={[speakerTile]} />)

    const button = screen.getByText("Ver detalles")
    expect(button).toHaveStyle({ backgroundColor: "rgb(18, 52, 86)" })
  })

  it("sources the category tile radius from --card-radius", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    const tile = screen.getByRole("link", { name: /bocinas bluetooth/i })
    expect(tile.className).toContain("rounded-[var(--card-radius,1.5rem)]")
  })

  it("sources the 'Ver detalles' button radius from --button-radius so it follows the theme", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    const button = screen.getByText("Ver detalles")
    expect(button.className).toContain("rounded-[var(--button-radius)]")
  })

  it("keeps POPULAR_DEFAULTS.buttonColor empty so it falls through to the theme token", () => {
    expect(POPULAR_DEFAULTS.buttonColor).toBe("")
  })

  it("renders the 'Ver detalles' button text in white, not var(--accent-foreground), so it stays readable on dark button colors", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    const button = screen.getByText("Ver detalles")
    expect(button).toHaveStyle({ color: "#ffffff" })
  })
})
