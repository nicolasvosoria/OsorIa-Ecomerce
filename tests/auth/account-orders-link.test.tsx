import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/auth/cuenta/actions", () => ({
  createSavedAddress: vi.fn(),
  updateSavedAddress: vi.fn(),
  deleteSavedAddress: vi.fn(),
  setDefaultSavedAddress: vi.fn(),
  saveAccountProfile: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { AccountPageClient } from "@/app/auth/cuenta/account-page-client"
import { LanguageProvider } from "@/contexts/language-context"

// D20: hay UNA sola pantalla de historial (/orders), la misma a la que llevan el
// menú de usuario y el footer. La cuenta enlaza a ella en vez de montar una
// segunda lista que se desincronizaría de la primera.
describe("Account page order history entry point", () => {
  it("links to the canonical /orders history instead of listing orders itself", () => {
    render(
      <LanguageProvider>
        <AccountPageClient
          view={{
            authenticated: true,
            email: "ana@example.com",
            profile: { firstName: "Ana", lastName: "Osorio", phone: null },
            addresses: [],
          }}
        />
      </LanguageProvider>,
    )

    expect(screen.getByRole("link", { name: "Mis pedidos" })).toHaveAttribute("href", "/orders")
    expect(screen.getByText("Tus pedidos")).toBeInTheDocument()
  })
})
