import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GuestLoginBanner } from "@/components/checkout/guest-login-banner"
import { CheckoutLoginIntentProvider, useCheckoutLoginIntent } from "@/contexts/checkout-login-intent-context"
import { LanguageProvider } from "@/contexts/language-context"

function CountReadout() {
  const { loginRequestCount } = useCheckoutLoginIntent()
  return <span data-testid="login-request-count">{loginRequestCount}</span>
}

function renderBanner() {
  render(
    <LanguageProvider>
      <CheckoutLoginIntentProvider>
        <GuestLoginBanner />
        <CountReadout />
      </CheckoutLoginIntentProvider>
    </LanguageProvider>,
  )
}

describe("GuestLoginBanner", () => {
  it("renders the already-have-an-account question and a login call to action", () => {
    renderBanner()

    expect(screen.getByText("¿Ya tienes una cuenta?")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Inicia sesión" })).toBeInTheDocument()
  })

  it("requests the login modal through the checkout login intent context when clicked", () => {
    renderBanner()

    expect(screen.getByTestId("login-request-count")).toHaveTextContent("0")

    fireEvent.click(screen.getByRole("button", { name: "Inicia sesión" }))

    expect(screen.getByTestId("login-request-count")).toHaveTextContent("1")
  })
})
