/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Instagram, INSTAGRAM_DEFAULTS } from "@/components/sections/instagram"

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

describe("Instagram", () => {
  it("renders every post's image", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<Instagram />)

    expect(container.querySelector('[data-component="instagram"]')).not.toBeNull()
    expect(container.querySelectorAll("img")).toHaveLength(INSTAGRAM_DEFAULTS.posts.length)
  })

  it("renders the section's title", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { getByText } = render(<Instagram />)
    expect(getByText(INSTAGRAM_DEFAULTS.title)).toBeTruthy()
  })

  it("renders the description when set, and omits it when empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, description: "Mirá lo último que compartimos" },
    }))

    const { getByText } = render(<Instagram />)
    expect(getByText("Mirá lo último que compartimos")).toBeTruthy()
  })

  it("wraps a post with a link in an <a> with target/rel set for an external link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        posts: [{ image: "/placeholder.svg", link: "https://example.com/p/123" }],
      },
    }))

    const { container } = render(<Instagram />)
    const links = container.querySelectorAll("a")
    const postLink = Array.from(links).find(
      (link) => link.getAttribute("href") === "https://example.com/p/123",
    )
    expect(postLink).toBeTruthy()
    expect(postLink).toHaveAttribute("target", "_blank")
    expect(postLink).toHaveAttribute("rel", "noopener noreferrer")
    expect(postLink?.querySelector("img")).not.toBeNull()
  })

  it("renders only the image, with no <a>, for a post without a link", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, handle: "", posts: [{ image: "/placeholder.svg", link: "" }] },
    }))

    const { container } = render(<Instagram />)
    expect(container.querySelector("a")).toBeNull()
    expect(container.querySelector("img")).not.toBeNull()
  })

  it("links the handle to instagram.com with target/rel set, stripping a leading @", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, handle: "@osoria.tienda" },
    }))

    const { container } = render(<Instagram />)
    const handleLink = container.querySelector('a[href="https://instagram.com/osoria.tienda"]')
    expect(handleLink).not.toBeNull()
    expect(handleLink).toHaveAttribute("target", "_blank")
    expect(handleLink).toHaveAttribute("rel", "noopener noreferrer")
    expect(handleLink?.textContent).toContain("@osoria.tienda")
  })

  it("omits the handle link when no handle is set", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, handle: "" },
    }))

    const { container } = render(<Instagram />)
    expect(container.querySelector('a[href^="https://instagram.com"]')).toBeNull()
  })

  it("renders nothing on the published site when the post list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, posts: [] },
    }))

    const { container } = render(<Instagram />)
    expect(container.firstChild).toBeNull()
  })

  it("shows an editable placeholder in preview/admin when the post list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(true)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, posts: [] },
    }))

    const { container } = render(<Instagram />)
    expect(container.querySelector('[data-component="instagram"]')).not.toBeNull()
    expect(container.textContent).toMatch(/publicaciones/i)
  })

  it("keeps INSTAGRAM_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(INSTAGRAM_DEFAULTS.sectionBgColor).toBe("")
    expect(INSTAGRAM_DEFAULTS.titleColor).toBe("")
    expect(INSTAGRAM_DEFAULTS.subtitleColor).toBe("")
  })
})
