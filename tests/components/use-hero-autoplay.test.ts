/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useHeroAutoplay } from "@/components/sections/hero/use-hero-autoplay"
import type { CarouselApi } from "@/components/ui/carousel"

function createMockApi(): NonNullable<CarouselApi> {
  const handlers: Record<string, () => void> = {}
  return {
    scrollNext: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      handlers[event] = handler
    }),
    off: vi.fn(),
  } as unknown as NonNullable<CarouselApi>
}

describe("useHeroAutoplay", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("schedules no auto-advance interval when disabled", () => {
    const api = createMockApi()
    renderHook(() => useHeroAutoplay(api, { enabled: false, intervalMs: 1000 }))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(api.scrollNext).not.toHaveBeenCalled()
  })

  it("advances every intervalMs when enabled, honoring a custom interval", () => {
    const api = createMockApi()
    renderHook(() => useHeroAutoplay(api, { enabled: true, intervalMs: 2000 }))

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(api.scrollNext).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(api.scrollNext).toHaveBeenCalledTimes(2)
  })

  it("reproduces today's hardcoded 10s cadence when given the default interval", () => {
    const api = createMockApi()
    renderHook(() => useHeroAutoplay(api, { enabled: true, intervalMs: 10000 }))

    act(() => {
      vi.advanceTimersByTime(9999)
    })
    expect(api.scrollNext).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(api.scrollNext).toHaveBeenCalledTimes(1)
  })

  it("does nothing when there is no carousel api yet (single-slide/not-ready safe)", () => {
    expect(() =>
      renderHook(() => useHeroAutoplay(undefined, { enabled: true, intervalMs: 1000 })),
    ).not.toThrow()
  })
})
