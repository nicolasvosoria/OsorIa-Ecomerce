/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { loadMoreShopProducts } = vi.hoisted(() => ({ loadMoreShopProducts: vi.fn() }))

vi.mock("@/app/shop/actions/load-more", () => ({ loadMoreShopProducts }))
vi.mock("@/app/shop/components/shop-filter-bar", () => ({ ShopFilterBar: () => null }))
vi.mock("@/app/shop/components/active-filter-chips", () => ({ ActiveFilterChips: () => null }))
vi.mock("@/app/shop/components/product-card", () => ({
  ProductCard: ({ product }: { product: { title: string } }) => <div>{product.title}</div>,
}))

import { ProductListContent } from "@/app/shop/components/product-list-content"
import { ProductsProvider } from "@/app/shop/providers/products-provider"
import { SHOP_PAGE_SIZE } from "@/lib/commerce/constants"
import type { Product, ShopServerFilters } from "@/lib/commerce/types"

const FILTERS: ShopServerFilters = { collection: "", onSale: false }

function product(id: string): Product {
  return { id, title: id } as unknown as Product
}

function ShopWrapper({ children }: { children: ReactNode }) {
  return (
    <NuqsTestingAdapter>
      <ProductsProvider>{children}</ProductsProvider>
    </NuqsTestingAdapter>
  )
}

describe("ProductListContent load more", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("appends the next page, de-duplicates, and hides the button at the end", async () => {
    loadMoreShopProducts.mockResolvedValue({
      products: [product("p2"), product("p3"), product("p4")],
      total: 4,
      hasMore: false,
    })

    render(
      <ProductListContent
        products={[product("p1"), product("p2")]}
        collections={[]}
        total={4}
        hasMore
        filters={FILTERS}
      />,
      { wrapper: ShopWrapper },
    )

    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }))

    await screen.findByText("p3")
    expect(screen.getByText("p4")).toBeInTheDocument()
    expect(screen.getAllByText("p2")).toHaveLength(1)
    expect(loadMoreShopProducts).toHaveBeenCalledWith({ ...FILTERS, offset: SHOP_PAGE_SIZE })
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument()
  })

  it("resets to the new first page when the server filters change", async () => {
    loadMoreShopProducts.mockResolvedValue({
      products: [product("p3"), product("p4")],
      total: 4,
      hasMore: false,
    })

    const { rerender } = render(
      <ProductListContent
        products={[product("p1"), product("p2")]}
        collections={[]}
        total={4}
        hasMore
        filters={FILTERS}
      />,
      { wrapper: ShopWrapper },
    )

    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }))
    await screen.findByText("p3")

    rerender(
      <ProductListContent
        products={[product("p5"), product("p6")]}
        collections={[]}
        total={2}
        hasMore={false}
        filters={{ ...FILTERS, collection: "ofertas" }}
      />,
    )

    await waitFor(() => expect(screen.queryByText("p1")).not.toBeInTheDocument())
    expect(screen.queryByText("p3")).not.toBeInTheDocument()
    expect(screen.getByText("p5")).toBeInTheDocument()
    expect(screen.getByText("p6")).toBeInTheDocument()
  })

  it("drops an in-flight page when the filters change before it resolves", async () => {
    let resolveLoad: (page: unknown) => void = () => {}
    loadMoreShopProducts.mockImplementation(
      () => new Promise(resolve => { resolveLoad = resolve }),
    )

    const { rerender } = render(
      <ProductListContent
        products={[product("p1"), product("p2")]}
        collections={[]}
        total={4}
        hasMore
        filters={FILTERS}
      />,
      { wrapper: ShopWrapper },
    )

    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }))

    rerender(
      <ProductListContent
        products={[product("p5"), product("p6")]}
        collections={[]}
        total={2}
        hasMore={false}
        filters={{ ...FILTERS, collection: "ofertas" }}
      />,
    )

    resolveLoad({ products: [product("p3"), product("p4")], total: 4, hasMore: false })

    await waitFor(() => expect(screen.getByText("p5")).toBeInTheDocument())
    expect(screen.queryByText("p3")).not.toBeInTheDocument()
    expect(screen.queryByText("p1")).not.toBeInTheDocument()
  })
})
