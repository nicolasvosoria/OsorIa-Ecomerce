/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import { describe, expect, it } from "vitest"

import { useAvailableColors } from "@/app/shop/hooks/use-available-colors"
import type { Product } from "@/lib/commerce/types"

function productWithColor(name: string): Product {
  return {
    options: [{ id: "opt-color", name: "Color", values: [{ id: name.toLowerCase(), name }] }],
  } as unknown as Product
}

describe("useAvailableColors value/label split", () => {
  it("exposes the English key for matching and a Spanish label for display", () => {
    const { result } = renderHook(() => useAvailableColors([productWithColor("Red")]), {
      wrapper: NuqsTestingAdapter,
    })

    expect(result.current.availableColors).toEqual([
      expect.objectContaining({ key: "Red", label: "Rojo" }),
    ])
  })

  it("stores the raw key (not the translated label) in the URL state when toggled", () => {
    const { result } = renderHook(() => useAvailableColors([productWithColor("Green")]), {
      wrapper: NuqsTestingAdapter,
    })

    act(() => {
      result.current.toggleColor(result.current.availableColors[0])
    })

    expect(result.current.activeColorFilters).toEqual(["Green"])
  })
})
