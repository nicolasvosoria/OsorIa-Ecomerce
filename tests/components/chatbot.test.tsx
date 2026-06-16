import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { Chatbot } from "@/components/chatbot/chatbot"

describe("Chatbot safe fallback", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "unavailable" }),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("does not invent generic discounts, coupons, offers, or sale routes when the API fails", async () => {
    render(<Chatbot isOpen onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/escribe tu pregunta/i), {
      target: { value: "¿Qué descuentos o cupones tienen hoy?" },
    })
    fireEvent.click(screen.getAllByRole("button").at(-1)!)

    await waitFor(() => {
      expect(screen.getByText(/no puedo confirmar promociones/i)).toBeInTheDocument()
    })

    const botTexts = screen.getAllByText(/./).map((node) => node.textContent ?? "").join("\n")
    expect(botTexts).not.toMatch(/ofertas especiales|promociones actuales|temporadas|\/sale/i)
    expect(botTexts).not.toMatch(/cup[oó]n [A-Z0-9]+/i)
  })
})
