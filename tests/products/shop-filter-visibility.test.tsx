/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react"
import { NuqsTestingAdapter, withNuqsTestingAdapter } from "nuqs/adapters/testing"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { ShopFilterBar } from "@/app/shop/components/shop-filter-bar"
import { ActiveFilterChips } from "@/app/shop/components/active-filter-chips"
import { DEFAULT_SHOP_CONFIG } from "@/lib/shop/shop-config"

const HIDDEN_ON_SALE_CONFIG = {
  ...DEFAULT_SHOP_CONFIG,
  filters: { ...DEFAULT_SHOP_CONFIG.filters, enOferta: false },
}

describe("ShopFilterBar filter visibility", () => {
  it("shows every control by default (today's shop)", () => {
    render(<ShopFilterBar collections={[]} products={[]} resultCount={0} />, {
      wrapper: NuqsTestingAdapter,
    })

    expect(screen.getByRole("button", { name: "En oferta" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Precio" })).toBeInTheDocument()
  })

  it("hides the En oferta control when filters.enOferta is false, leaving the rest untouched", () => {
    render(
      <ShopFilterBar collections={[]} products={[]} resultCount={0} config={HIDDEN_ON_SALE_CONFIG} />,
      { wrapper: NuqsTestingAdapter },
    )

    expect(screen.queryByRole("button", { name: "En oferta" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Precio" })).toBeInTheDocument()
  })
})

describe("ActiveFilterChips filter visibility", () => {
  it("shows the En oferta chip by default when the URL carries it", () => {
    render(<ActiveFilterChips collections={[]} products={[]} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: "?oferta=1" }),
    })

    expect(screen.getByText("En oferta")).toBeInTheDocument()
  })

  it("drops the En oferta chip when filters.enOferta is hidden, even with ?oferta=1 in the URL", () => {
    render(
      <ActiveFilterChips collections={[]} products={[]} config={HIDDEN_ON_SALE_CONFIG} />,
      { wrapper: withNuqsTestingAdapter({ searchParams: "?oferta=1" }) },
    )

    expect(screen.queryByText("En oferta")).not.toBeInTheDocument()
  })
})
