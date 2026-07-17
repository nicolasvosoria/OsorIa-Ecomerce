import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// El banner de invitado (D2) solo debe existir cuando la sesión no está
// autenticada; para un cliente logueado, /checkout va directo al formulario
// con datos de cuenta, sin el banner. `isAuthenticatedOverride` es mutable
// entre tests para cubrir ambos estados sin remontar mocks.
let isAuthenticatedOverride = vi.hoisted(() => false)

const CART_ITEM_FIXTURE = [
  { id: "item-1", name: "Parlante Bluetooth", price: "100000", currencyCode: "COP", image: "", quantity: 1 },
]

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock("@/contexts/cart-context", () => ({
  useCart: () => ({
    items: CART_ITEM_FIXTURE,
    hasHydrated: true,
    getItemSubtotal: () => 100000,
    getTotal: () => 100000,
  }),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: isAuthenticatedOverride ? { id: "user-1", email: "ada@example.com" } : null,
    isAuthenticated: isAuthenticatedOverride,
    isLoading: false,
  }),
}))
vi.mock("@/app/checkout/actions", () => ({
  placeCheckoutOrder: vi.fn(),
  getCheckoutPrefill: vi.fn().mockResolvedValue(null),
}))
vi.mock("@/components/checkout/guest-checkout-form", () => ({
  GuestCheckoutForm: () => <div data-testid="guest-checkout-form" />,
}))
vi.mock("@/components/checkout/authenticated-checkout-form", () => ({
  AuthenticatedCheckoutForm: () => <div data-testid="authenticated-checkout-form" />,
}))

import CheckoutPage from "@/app/checkout/page"
import { CheckoutLoginIntentProvider } from "@/contexts/checkout-login-intent-context"
import { LanguageProvider } from "@/contexts/language-context"

function renderCheckoutPage() {
  render(
    <LanguageProvider>
      <CheckoutLoginIntentProvider>
        <CheckoutPage />
      </CheckoutLoginIntentProvider>
    </LanguageProvider>,
  )
}

describe("Checkout page guest login banner", () => {
  beforeEach(() => {
    isAuthenticatedOverride = false
  })

  it("renders the guest login banner above the guest form when there is no session", () => {
    renderCheckoutPage()

    expect(screen.getByRole("button", { name: "Inicia sesión" })).toBeInTheDocument()
    expect(screen.getByTestId("guest-checkout-form")).toBeInTheDocument()
  })

  it("does not render the guest login banner for a signed-in customer", () => {
    isAuthenticatedOverride = true
    renderCheckoutPage()

    expect(screen.queryByRole("button", { name: "Inicia sesión" })).not.toBeInTheDocument()
    expect(screen.getByTestId("authenticated-checkout-form")).toBeInTheDocument()
  })
})
