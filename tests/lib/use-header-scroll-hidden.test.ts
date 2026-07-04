import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useHeaderScrollHidden } from "@/lib/hooks/use-header-scroll-hidden"

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, writable: true, configurable: true })
}

function scroll(value: number) {
  act(() => {
    setScrollY(value)
    window.dispatchEvent(new Event("scroll"))
  })
}

describe("useHeaderScrollHidden", () => {
  beforeEach(() => {
    setScrollY(0)
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stays visible when disabled, even while scrolling down past the threshold", () => {
    const { result } = renderHook(() => useHeaderScrollHidden(false))

    scroll(300)

    expect(result.current).toBe(false)
  })

  it("hides once scrolling down passes the threshold", () => {
    const { result } = renderHook(() => useHeaderScrollHidden(true))

    scroll(150)

    expect(result.current).toBe(true)
  })

  it("stays visible while scrolling down but still under the threshold", () => {
    const { result } = renderHook(() => useHeaderScrollHidden(true))

    scroll(50)

    expect(result.current).toBe(false)
  })

  it("shows again when scrolling back up", () => {
    const { result } = renderHook(() => useHeaderScrollHidden(true))

    scroll(300)
    expect(result.current).toBe(true)

    scroll(200)
    expect(result.current).toBe(false)
  })

  it("is always visible at the very top", () => {
    const { result } = renderHook(() => useHeaderScrollHidden(true))

    scroll(300)
    expect(result.current).toBe(true)

    scroll(0)
    expect(result.current).toBe(false)
  })
})
