/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Testimonials, TESTIMONIALS_DEFAULTS } from "@/components/sections/testimonials"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()
const mockUseIsPreviewOrAdminSection = vi.fn()

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}))

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}))

vi.mock("@/lib/sections/section-empty-state", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sections/section-empty-state")>(
    "@/lib/sections/section-empty-state",
  )
  return {
    ...actual,
    useIsPreviewOrAdminSection: () => mockUseIsPreviewOrAdminSection(),
  }
})

describe("Testimonials", () => {
  it("renders every testimonial's quote, author and role", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container, getByText } = render(<Testimonials />)

    expect(container.querySelector('[data-component="testimonials"]')).not.toBeNull()
    for (const item of TESTIMONIALS_DEFAULTS.testimonials) {
      expect(getByText(item.quote)).toBeTruthy()
      expect(getByText(item.author)).toBeTruthy()
      expect(getByText(item.role)).toBeTruthy()
    }
  })

  it("renders nothing on the published site when the testimonial list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, testimonials: [] },
    }))

    const { container } = render(<Testimonials />)
    expect(container.firstChild).toBeNull()
  })

  it("shows an editable placeholder in preview/admin when the testimonial list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(true)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, testimonials: [] },
    }))

    const { container } = render(<Testimonials />)
    expect(container.querySelector('[data-component="testimonials"]')).not.toBeNull()
    expect(container.textContent).toMatch(/testimonios/i)
  })

  it("keeps TESTIMONIALS_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(TESTIMONIALS_DEFAULTS.sectionBgColor).toBe("")
    expect(TESTIMONIALS_DEFAULTS.cardBgColor).toBe("")
    expect(TESTIMONIALS_DEFAULTS.titleColor).toBe("")
    expect(TESTIMONIALS_DEFAULTS.quoteColor).toBe("")
    expect(TESTIMONIALS_DEFAULTS.authorColor).toBe("")
    expect(TESTIMONIALS_DEFAULTS.roleColor).toBe("")
  })
})
