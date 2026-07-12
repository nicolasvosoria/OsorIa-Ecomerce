/** @vitest-environment jsdom */

import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Faq, FAQ_DEFAULTS } from "@/components/sections/faq"

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

describe("Faq", () => {
  it("renders the section's title and description", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, description: "Todo lo que necesitás saber" },
    }))

    const { container, getByText } = render(<Faq />)

    expect(container.querySelector('[data-component="faq"]')).not.toBeNull()
    expect(getByText(FAQ_DEFAULTS.title)).toBeTruthy()
    expect(getByText("Todo lo que necesitás saber")).toBeTruthy()
  })

  it("renders every item's question, all collapsed by default", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { getByText, queryByText } = render(<Faq />)

    for (const item of FAQ_DEFAULTS.items) {
      expect(getByText(item.question)).toBeTruthy()
      expect(queryByText(item.answer)).toBeNull()
    }
  })

  it("expands a single item on click without affecting the others", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { getByText, queryByText } = render(<Faq />)
    const [first, second] = FAQ_DEFAULTS.items

    fireEvent.click(getByText(first.question))
    expect(getByText(first.answer)).toBeTruthy()
    expect(queryByText(second.answer)).toBeNull()

    fireEvent.click(getByText(first.question))
    expect(queryByText(first.answer)).toBeNull()
  })

  it("closes the previously open item when singleOpen is on", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, singleOpen: true },
    }))

    const { getByText, queryByText } = render(<Faq />)
    const [first, second] = FAQ_DEFAULTS.items

    fireEvent.click(getByText(first.question))
    expect(getByText(first.answer)).toBeTruthy()

    fireEvent.click(getByText(second.question))
    expect(queryByText(first.answer)).toBeNull()
    expect(getByText(second.answer)).toBeTruthy()
  })

  it("sets aria-expanded on the toggle button to match open state", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { getByText } = render(<Faq />)
    const question = FAQ_DEFAULTS.items[0].question
    const button = getByText(question).closest("button")

    expect(button).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(getByText(question))
    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("renders nothing on the published site when the item list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(false)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, items: [] },
    }))

    const { container } = render(<Faq />)
    expect(container.firstChild).toBeNull()
  })

  it("shows an editable placeholder in preview/admin when the item list is empty", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseIsPreviewOrAdminSection.mockReturnValue(true)
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, items: [] },
    }))

    const { container } = render(<Faq />)
    expect(container.querySelector('[data-component="faq"]')).not.toBeNull()
    expect(container.textContent).toMatch(/preguntas frecuentes/i)
  })

  it("keeps FAQ_DEFAULTS' color fields empty so they fall through to theme tokens", () => {
    expect(FAQ_DEFAULTS.sectionBgColor).toBe("")
    expect(FAQ_DEFAULTS.cardBgColor).toBe("")
    expect(FAQ_DEFAULTS.borderColor).toBe("")
    expect(FAQ_DEFAULTS.titleColor).toBe("")
    expect(FAQ_DEFAULTS.subtitleColor).toBe("")
    expect(FAQ_DEFAULTS.questionColor).toBe("")
    expect(FAQ_DEFAULTS.answerColor).toBe("")
  })
})
