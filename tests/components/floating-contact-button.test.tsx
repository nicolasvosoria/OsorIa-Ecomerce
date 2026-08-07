import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { vi } from "vitest"

import { FloatingContactButton } from "@/components/ui/floating-contact-button"

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => ({ isAdmin: false, isEditMode: false, selectedComponent: null }),
}))

vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    language: "es",
    t: {
      contact: {
        title: "Contáctanos",
        contactUs: "Contáctanos",
        close: "Cerrar",
        whatsapp: "WhatsApp",
        chatbot: "Chatbot",
      },
    },
  }),
}))

vi.mock("@/components/chatbot/chatbot", () => ({
  Chatbot: () => null,
}))

// The full normalization matrix (bare mobile, landline, +57, punctuation,
// extension, no digits, wrong digit count) lives in
// tests/stores/whatsapp-contact.test.ts against an independent truth -- this
// file only checks that the component wires that result into the DOM
// correctly: a real link renders, and an unusable phone is absent exactly
// like no phone at all (D14).
describe("FloatingContactButton WhatsApp link (D14/A9)", () => {
  it("links to the store's real number instead of the old hardcoded placeholder", () => {
    render(<FloatingContactButton phone="+57 300 000 0000" />)

    const whatsappLink = screen.getByRole("link", { name: /whatsapp/i })
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/573000000000")
    expect(whatsappLink.getAttribute("href")).not.toBe("https://wa.me/1234567890")
  })

  it("renders no WhatsApp option at all when the store has no phone -- absent, not a fallback or a disabled state", () => {
    render(<FloatingContactButton phone={null} />)

    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument()
    // The rest of the widget (chatbot, main toggle) still renders.
    expect(screen.getByRole("button", { name: /contáctanos/i })).toBeInTheDocument()
  })

  it("also stays absent for a saved phone that can't be turned into a working link (an extension, here)", () => {
    render(<FloatingContactButton phone="300 000 0000 ext 123" />)

    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument()
  })
})
