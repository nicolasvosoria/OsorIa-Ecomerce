import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useHasHydrated } from "@/lib/hooks/use-has-hydrated"

describe("useHasHydrated", () => {
  it("is true once mounted on the client", () => {
    const { result } = renderHook(() => useHasHydrated())
    expect(result.current).toBe(true)
  })
})
