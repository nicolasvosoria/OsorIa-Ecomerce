import { render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { PopularItems, POPULAR_DEFAULTS } from "@/components/sections/popular-items"
import type { PopularCategoryTile } from "@/lib/products/popular-sections"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()
const mockGetAdminRequestHeaders = vi.fn()

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

vi.mock("@/lib/supabase/admin-request-headers", () => ({
  getAdminRequestHeaders: (...args: unknown[]) => mockGetAdminRequestHeaders(...args),
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
    mockGetAdminRequestHeaders.mockResolvedValue({})
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
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tiles: [speakerTile] }), { status: 200 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    render(<PopularItems />)

    await waitFor(() => expect(screen.getByText("Bocinas Bluetooth")).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it("threads the stored categoryTiles override into the editor preview's fetch, sanitized", async () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        categoryTiles: [{ categoryId: "cat-speakers", imageUrl: "/custom.webp" }, { categoryId: "" }],
      },
    }))
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tiles: [speakerTile] }), { status: 200 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    render(<PopularItems />)

    await waitFor(() => expect(screen.getByText("Bocinas Bluetooth")).toBeInTheDocument())
    const requestedUrl = fetchMock.mock.calls[0][0] as string
    expect(requestedUrl).toBe(
      `/api/admin/popular-category-tiles?categoryTiles=${encodeURIComponent(
        JSON.stringify([{ categoryId: "cat-speakers", imageUrl: "/custom.webp" }]),
      )}`,
    )

    vi.unstubAllGlobals()
  })

  it("shows an accessible empty-image placeholder when a category has no image", () => {
    render(<PopularItems initialTiles={[earphonesTile]} />)

    expect(screen.getByRole("img", { name: /sin imagen para auriculares y audífonos/i })).toBeInTheDocument()
  })

  it("falls back to the theme's --sec-popular-button token when no color override is set", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    const button = screen.getByText("Ver detalles")
    expect(button).toHaveStyle({ backgroundColor: "var(--sec-popular-button, var(--primary))" })
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
    expect(tile.className).toContain("rounded-card")
  })

  it("sources the 'Ver detalles' button radius from --button-radius so it follows the theme", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    const button = screen.getByText("Ver detalles")
    expect(button.className).toContain("rounded-[var(--button-radius)]")
  })

  it("keeps POPULAR_DEFAULTS.buttonColor empty so it falls through to the theme token", () => {
    expect(POPULAR_DEFAULTS.buttonColor).toBe("")
  })

  it("renders the 'Ver detalles' button text in var(--primary-foreground) so it pairs with the primary button background", () => {
    render(<PopularItems initialTiles={[speakerTile]} />)

    const button = screen.getByText("Ver detalles")
    expect(button).toHaveStyle({ color: "var(--primary-foreground)" })
  })

  describe("layout options", () => {
    it("reproduces the current layout with unset options: 2 columns, aspect-[6/5] tiles, overlay text, price shown", () => {
      render(<PopularItems initialTiles={[speakerTile, earphonesTile]} />)

      const grid = screen.getByText("Bocinas Bluetooth").closest("a")?.parentElement
      expect(grid?.className).toContain("sm:grid-cols-2")
      expect(grid?.className).not.toContain("md:grid-cols-3")

      const tile = screen.getByRole("link", { name: /bocinas bluetooth/i })
      expect(tile.className).toContain("aspect-[6/5]")
      // Overlay mode: the text sits in an absolutely-positioned layer on top of the image.
      expect(tile.className).toContain("relative")
      expect(screen.getByText("Bocinas Bluetooth").closest("div")?.className).toContain("absolute")
      expect(screen.getByText("Desde $ 356.000")).toBeInTheDocument()
    })

    it("honors columns=3", () => {
      mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
        styles: { ...defaults, columns: "3" },
      }))

      render(<PopularItems initialTiles={[speakerTile, earphonesTile]} />)

      const grid = screen.getByText("Bocinas Bluetooth").closest("a")?.parentElement
      expect(grid?.className).toContain("md:grid-cols-3")
    })

    it("honors tileAspect=cuadrado", () => {
      mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
        styles: { ...defaults, tileAspect: "cuadrado" },
      }))

      render(<PopularItems initialTiles={[speakerTile]} />)

      const tile = screen.getByRole("link", { name: /bocinas bluetooth/i })
      expect(tile.className).toContain("aspect-square")
      expect(tile.className).not.toContain("aspect-[6/5]")
    })

    it("honors textPlacement=below by rendering the text outside the image, not in an absolute overlay", () => {
      mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
        styles: { ...defaults, textPlacement: "below" },
      }))

      render(<PopularItems initialTiles={[speakerTile]} />)

      const heading = screen.getByText("Bocinas Bluetooth")
      expect(heading.closest("div")?.className).not.toContain("absolute")
      expect(screen.getAllByText("Desde $ 356.000")).toHaveLength(2)
    })

    it("honors showStartingPrice=false by hiding each tile's starting-price label", () => {
      mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
        styles: { ...defaults, showStartingPrice: false },
      }))

      render(<PopularItems initialTiles={[speakerTile, earphonesTile]} />)

      expect(screen.queryByText("Desde $ 356.000")).not.toBeInTheDocument()
      // The header's own "Desde $X" summary is a separate feature and stays visible.
      expect(screen.getByTestId("popular-items-starting-price")).toBeInTheDocument()
    })

    it("shrinks the overlay title/price/CTA sizing at columns=4 so nothing overlaps or clips", () => {
      mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
        styles: { ...defaults, columns: "4" },
      }))

      render(<PopularItems initialTiles={[speakerTile]} />)

      const tile = screen.getByRole("link", { name: /bocinas bluetooth/i })
      const title = within(tile).getByText("Bocinas Bluetooth")
      // Mobile grid is always a single full-width column, so the base
      // (unprefixed) size is raised; it only shrinks once the grid actually
      // narrows to 2/4 columns at `sm:`/`md:`.
      expect(title.className).toContain("text-[22px]")
      expect(title.className).toContain("sm:text-[18px]")
      expect(title.className).not.toContain("text-[24px]")

      const price = within(tile).getByText("Desde $ 356.000")
      expect(price.className).toContain("text-[13px]")
      expect(price.className).toContain("sm:text-[12px]")

      const cta = within(tile).getByText("Ver detalles")
      expect(cta.className).toContain("sm:min-h-[32px]")
      expect(cta.className).not.toContain("min-h-[44px]")
    })

    it("keeps the columns=2 overlay sizing identical to today (no regression)", () => {
      render(<PopularItems initialTiles={[speakerTile]} />)

      const title = screen.getByText("Bocinas Bluetooth")
      expect(title.className).toContain("text-[24px]")

      const cta = screen.getByText("Ver detalles")
      expect(cta.className).toContain("min-h-[44px]")
      expect(cta.className).toContain("px-5")
    })

    it("honors gridLayout=mosaic by applying the span classes only to the first tile", () => {
      mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
        styles: { ...defaults, gridLayout: "mosaic" },
      }))

      render(<PopularItems initialTiles={[speakerTile, earphonesTile]} />)

      const firstTile = screen.getByRole("link", { name: /bocinas bluetooth/i })
      const secondTile = screen.getByRole("link", { name: /auriculares y audífonos/i })
      expect(firstTile.className).toContain("sm:col-span-2")
      expect(firstTile.className).toContain("sm:row-span-2")
      expect(secondTile.className).not.toContain("sm:col-span-2")
    })

    it("gives the mosaic first tile columns=2 overlay sizing even at columns=4 (it renders 2x2, not a single narrow cell)", () => {
      mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
        styles: { ...defaults, gridLayout: "mosaic", columns: "4" },
      }))

      render(<PopularItems initialTiles={[speakerTile, earphonesTile]} />)

      const firstTile = screen.getByRole("link", { name: /bocinas bluetooth/i })
      const firstTitle = within(firstTile).getByText("Bocinas Bluetooth")
      expect(firstTitle.className).toContain("text-[24px]")

      const secondTile = screen.getByRole("link", { name: /auriculares y audífonos/i })
      const secondTitle = within(secondTile).getByText("Auriculares y Audífonos")
      expect(secondTitle.className).toContain("text-[22px]")
      expect(secondTitle.className).not.toContain("text-[24px]")
    })
  })

  describe("ephemeral data-edit refetch (editor preview live update)", () => {
    it("does not fetch and keeps showing initialTiles when there is no ephemeral categoryTiles edit", async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal("fetch", fetchMock)

      render(<PopularItems initialTiles={[speakerTile]} />)

      expect(screen.getByText("Bocinas Bluetooth")).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })

    it("re-fetches and uses the fetched tiles when an ephemeral categoryTiles edit is staged, even though initialTiles is given", async () => {
      mockUseAdmin.mockReturnValue({
        componentEdits: new Map([
          ["popular", { categoryTiles: [{ categoryId: "cat-earphones" }] }],
        ]),
      })
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ tiles: [earphonesTile] }), { status: 200 }),
      )
      vi.stubGlobal("fetch", fetchMock)

      render(<PopularItems initialTiles={[speakerTile]} />)

      await waitFor(() => expect(screen.getByText("Auriculares y Audífonos")).toBeInTheDocument())
      expect(screen.queryByText("Bocinas Bluetooth")).not.toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/popular-category-tiles?categoryTiles=${encodeURIComponent(
          JSON.stringify([{ categoryId: "cat-earphones" }]),
        )}`,
        expect.anything(),
      )

      vi.unstubAllGlobals()
    })
  })
})
