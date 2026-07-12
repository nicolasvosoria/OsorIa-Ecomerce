import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { resolveEmptySectionState, useIsPreviewOrAdminSection } from "@/lib/sections/section-empty-state"

const mockUseAdmin = vi.fn()
const mockIsThemePreviewMode = vi.fn()

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}))

vi.mock("@/lib/theme-font/preview-mode", () => ({
  isThemePreviewMode: () => mockIsThemePreviewMode(),
}))

describe("resolveEmptySectionState", () => {
  it("shows content whenever the list isn't empty, regardless of preview/admin", () => {
    expect(resolveEmptySectionState(3, false)).toBe("content")
    expect(resolveEmptySectionState(3, true)).toBe("content")
  })

  it("hides an empty list on the published site", () => {
    expect(resolveEmptySectionState(0, false)).toBe("hidden")
  })

  it("shows a placeholder for an empty list in preview/admin", () => {
    expect(resolveEmptySectionState(0, true)).toBe("placeholder")
  })
})

describe("useIsPreviewOrAdminSection", () => {
  it("is false outside the theme preview iframe and outside admin edit mode", () => {
    mockUseAdmin.mockReturnValue({ isEditMode: false })
    mockIsThemePreviewMode.mockReturnValue(false)

    const { result } = renderHook(() => useIsPreviewOrAdminSection())
    expect(result.current).toBe(false)
  })

  it("is true inside the theme customizer's preview iframe", () => {
    mockUseAdmin.mockReturnValue({ isEditMode: false })
    mockIsThemePreviewMode.mockReturnValue(true)

    const { result } = renderHook(() => useIsPreviewOrAdminSection())
    expect(result.current).toBe(true)
  })

  it("is true in the live storefront's own admin edit mode", () => {
    mockUseAdmin.mockReturnValue({ isEditMode: true })
    mockIsThemePreviewMode.mockReturnValue(false)

    const { result } = renderHook(() => useIsPreviewOrAdminSection())
    expect(result.current).toBe(true)
  })
})
