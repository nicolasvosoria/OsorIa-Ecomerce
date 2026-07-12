/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Story, STORY_DEFAULTS } from "@/components/sections/story"

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

describe("Story", () => {
  it("renders the title, description and CTA", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container, getByText } = render(<Story />)

    expect(container.querySelector('[data-component="story"]')).not.toBeNull()
    expect(getByText(STORY_DEFAULTS.title)).toBeTruthy()
    expect(getByText(STORY_DEFAULTS.description)).toBeTruthy()
    expect(getByText(STORY_DEFAULTS.buttonText)).toBeTruthy()
  })

  it("renders the configured image", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, image: "/story.jpg" },
    }))

    const { container } = render(<Story />)
    expect(container.querySelector("img")).not.toBeNull()
  })

  it("wraps the CTA in an <a> with target/rel set for an external link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, buttonLink: "https://example.com" },
    }))

    const { container } = render(<Story />)
    const link = container.querySelector("a")

    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("does not set target/rel on the CTA for an internal link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, buttonLink: "/nosotros" },
    }))

    const { container } = render(<Story />)
    const link = container.querySelector("a")

    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "/nosotros")
    expect(link).not.toHaveAttribute("target")
    expect(link).not.toHaveAttribute("rel")
  })

  it("renders no image when imagePosition is 'none', even if an image is configured", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, image: "/story.jpg", imagePosition: "none" },
    }))

    const { container } = render(<Story />)
    expect(container.querySelector("img")).toBeNull()
  })

  it("renders nothing on the published site when title and description are both empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, title: "", description: "" },
    }))

    const { container } = render(<Story />)
    expect(container.firstChild).toBeNull()
  })

  it("shows an editable placeholder in preview/admin when title and description are both empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(true)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, title: "", description: "" },
    }))

    const { container } = render(<Story />)
    expect(container.querySelector('[data-component="story"]')).not.toBeNull()
    expect(container.textContent).toMatch(/historia de marca/i)
  })

  it("keeps STORY_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(STORY_DEFAULTS.sectionBgColor).toBe("")
    expect(STORY_DEFAULTS.titleColor).toBe("")
    expect(STORY_DEFAULTS.subtitleColor).toBe("")
    expect(STORY_DEFAULTS.buttonColor).toBe("")
    expect(STORY_DEFAULTS.buttonTextColor).toBe("")
  })
})
