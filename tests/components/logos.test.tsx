/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Logos, LOGOS_DEFAULTS } from "@/components/sections/logos"

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

describe("Logos", () => {
  it("renders every logo's image", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<Logos />)

    expect(container.querySelector('[data-component="logos"]')).not.toBeNull()
    expect(container.querySelectorAll("img")).toHaveLength(LOGOS_DEFAULTS.logos.length)
  })

  it("renders the section's title", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { getByText } = render(<Logos />)
    expect(getByText(LOGOS_DEFAULTS.title)).toBeTruthy()
  })

  it("renders the description when set, and omits it when empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, description: "Contamos con el respaldo de las mejores marcas" },
    }))

    const { getByText } = render(<Logos />)
    expect(getByText("Contamos con el respaldo de las mejores marcas")).toBeTruthy()
  })

  it("wraps a logo with a link in an <a> with target/rel set for an external link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        logos: [{ image: "/placeholder.svg", link: "https://example.com" }],
      },
    }))

    const { container } = render(<Logos />)
    const link = container.querySelector("a")
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(link?.querySelector("img")).not.toBeNull()
  })

  it("renders only the image, with no <a>, for a logo without a link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, logos: [{ image: "/placeholder.svg", link: "" }] },
    }))

    const { container } = render(<Logos />)
    expect(container.querySelector("a")).toBeNull()
    expect(container.querySelector("img")).not.toBeNull()
  })

  it("renders nothing on the published site when the logo list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, logos: [] },
    }))

    const { container } = render(<Logos />)
    expect(container.firstChild).toBeNull()
  })

  it("shows an editable placeholder in preview/admin when the logo list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(true)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, logos: [] },
    }))

    const { container } = render(<Logos />)
    expect(container.querySelector('[data-component="logos"]')).not.toBeNull()
    expect(container.textContent).toMatch(/logos/i)
  })

  it("keeps LOGOS_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(LOGOS_DEFAULTS.sectionBgColor).toBe("")
    expect(LOGOS_DEFAULTS.titleColor).toBe("")
    expect(LOGOS_DEFAULTS.subtitleColor).toBe("")
  })
})
