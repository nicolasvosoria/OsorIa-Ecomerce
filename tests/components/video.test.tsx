/** @vitest-environment jsdom */

import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Video, VIDEO_DEFAULTS } from "@/components/sections/video"

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

describe("Video", () => {
  it("renders the section's title and description", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, description: "Conocé nuestro taller" },
    }))

    const { container, getByText } = render(<Video />)

    expect(container.querySelector('[data-component="video"]')).not.toBeNull()
    expect(getByText(VIDEO_DEFAULTS.title)).toBeTruthy()
    expect(getByText("Conocé nuestro taller")).toBeTruthy()
  })

  it("renders a sandboxed iframe with a built YouTube embed src for a YouTube URL", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    }))

    const { container } = render(<Video />)
    const iframe = container.querySelector("iframe")

    expect(iframe).not.toBeNull()
    expect(iframe).toHaveAttribute("src", "https://www.youtube.com/embed/dQw4w9WgXcQ")
    expect(iframe).toHaveAttribute("loading", "lazy")
    expect(iframe).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin")
    // `allow-same-origin` is required for the YouTube/Vimeo player to boot (its
    // absence is what left the embed black) — safe here since `embedSrc` only
    // ever points at the fixed, whitelisted youtube.com/player.vimeo.com hosts.
    expect(iframe?.getAttribute("sandbox")).toContain("allow-same-origin")
    expect(iframe?.getAttribute("sandbox")).toContain("allow-scripts")
    expect(container.querySelector("video")).toBeNull()
  })

  it("does not let a configured poster cover the iframe for a YouTube URL", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        poster: "https://cdn.example.com/poster.jpg",
      },
    }))

    const { container } = render(<Video />)

    // `poster` only applies to the `<video>` element (direct file URLs); it
    // must never be rendered as an overlay/background over the YouTube/Vimeo
    // iframe, or it would visually hide the embed.
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector('[style*="poster.jpg"]')).toBeNull()
    const iframe = container.querySelector("iframe")
    expect(iframe).not.toBeNull()
    expect(iframe).toHaveAttribute("src", "https://www.youtube.com/embed/dQw4w9WgXcQ")
  })

  it("appends autoplay+mute query params to the YouTube embed src when autoplay is on", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: {
        ...defaults,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        autoplay: true,
      },
    }))

    const { container } = render(<Video />)
    const iframe = container.querySelector("iframe")

    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1",
    )
    expect(iframe?.getAttribute("allow")).toContain("autoplay")
  })

  it("renders a <video> element (not an iframe) for a direct MP4 URL", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, url: "https://cdn.example.com/clips/intro.mp4" },
    }))

    const { container } = render(<Video />)
    const video = container.querySelector("video")

    expect(video).not.toBeNull()
    expect(video).toHaveAttribute("src", "https://cdn.example.com/clips/intro.mp4")
    expect(video).toHaveAttribute("controls")
    expect(container.querySelector("iframe")).toBeNull()
  })

  it("renders nothing on the published site when the URL is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, url: "" },
    }))

    const { container } = render(<Video />)
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing on the published site when the URL is invalid (e.g. javascript:)", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, url: "javascript:alert(1)" },
    }))

    const { container } = render(<Video />)
    expect(container.firstChild).toBeNull()
  })

  it("shows an editable placeholder in preview/admin when the URL is empty or invalid", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(true)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, url: "" },
    }))

    const { container } = render(<Video />)
    expect(container.querySelector('[data-component="video"]')).not.toBeNull()
    expect(container.textContent).toMatch(/url de video/i)
    expect(container.querySelector("iframe")).toBeNull()
    expect(container.querySelector("video")).toBeNull()
  })

  it("keeps VIDEO_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(VIDEO_DEFAULTS.sectionBgColor).toBe("")
    expect(VIDEO_DEFAULTS.titleColor).toBe("")
    expect(VIDEO_DEFAULTS.subtitleColor).toBe("")
  })
})
