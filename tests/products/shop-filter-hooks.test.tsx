/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import { describe, expect, it } from "vitest"

import { useKindFilter, useOnSaleFilter, usePriceRange } from "@/app/shop/hooks/use-shop-filters"

describe("shop filter hooks (instant-apply state)", () => {
  it("toggles the oferta filter on and off", () => {
    const { result } = renderHook(() => useOnSaleFilter(), { wrapper: NuqsTestingAdapter })

    expect(result.current.isOnSale).toBe(false)

    act(() => {
      result.current.setOnSale(true)
    })
    expect(result.current.isOnSale).toBe(true)

    act(() => {
      result.current.setOnSale(false)
    })
    expect(result.current.isOnSale).toBe(false)
  })

  it("sets and clears the price range", () => {
    const { result } = renderHook(() => usePriceRange(), { wrapper: NuqsTestingAdapter })

    expect(result.current.hasPriceFilter).toBe(false)

    act(() => {
      result.current.setPriceRange(10000, 50000)
    })
    expect(result.current.priceMin).toBe(10000)
    expect(result.current.priceMax).toBe(50000)
    expect(result.current.hasPriceFilter).toBe(true)

    act(() => {
      result.current.clearPriceRange()
    })
    expect(result.current.hasPriceFilter).toBe(false)
  })

  it("marks the combo kind selection", () => {
    const { result } = renderHook(() => useKindFilter(), { wrapper: NuqsTestingAdapter })

    expect(result.current.isCombo).toBe(false)

    act(() => {
      result.current.setKind("combo")
    })
    expect(result.current.isCombo).toBe(true)

    act(() => {
      result.current.setKind("all")
    })
    expect(result.current.isCombo).toBe(false)
  })
})
