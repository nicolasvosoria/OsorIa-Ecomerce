import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { AuthenticatedCheckoutForm } from "@/components/checkout/authenticated-checkout-form"
import type { CheckoutPrefill } from "@/app/checkout/actions"
import { LanguageProvider } from "@/contexts/language-context"
import type { UserProfile } from "@/lib/types/user"

const SUBMIT_LABEL = "Realizar pedido"
const PHONE_LABEL = "Teléfono / Celular *"
const ADDRESS_LABEL = "Dirección de Envío *"

const ACCOUNT_USER: UserProfile = {
  id: "user-1",
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
}

function renderAuthenticatedForm(onComplete = vi.fn(), prefill?: CheckoutPrefill) {
  const { rerender } = render(
    <LanguageProvider>
      <AuthenticatedCheckoutForm user={ACCOUNT_USER} onComplete={onComplete} prefill={prefill} />
    </LanguageProvider>,
  )

  return {
    onComplete,
    rerenderWithPrefill: (nextPrefill: CheckoutPrefill) =>
      rerender(
        <LanguageProvider>
          <AuthenticatedCheckoutForm user={ACCOUNT_USER} onComplete={onComplete} prefill={nextPrefill} />
        </LanguageProvider>,
      ),
  }
}

describe("AuthenticatedCheckoutForm account data", () => {
  it("shows the signed-in user's name and email as read-only, with no editable fields for them", () => {
    renderAuthenticatedForm()

    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument()
    expect(screen.getByText("ada@example.com")).toBeInTheDocument()
    // Solo teléfono y dirección son editables; nombre/correo vienen de la cuenta.
    expect(screen.getAllByRole("textbox")).toHaveLength(2)
  })
})

describe("AuthenticatedCheckoutForm field validation", () => {
  it("requires phone and address before submitting", async () => {
    renderAuthenticatedForm()

    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    const phone = await screen.findByLabelText(PHONE_LABEL)
    await waitFor(() => expect(phone).toHaveAttribute("aria-invalid", "true"))

    const errorId = phone.getAttribute("aria-describedby")
    expect(document.getElementById(errorId as string)).toHaveTextContent(
      "El teléfono es requerido",
    )
  })
})

describe("AuthenticatedCheckoutForm payment method section", () => {
  it("renders the enabled method from the registry and forwards it in the payload", async () => {
    const { onComplete } = renderAuthenticatedForm()

    expect(screen.getByRole("radio", { name: /Pago contra entrega/ })).toBeChecked()

    fireEvent.change(screen.getByLabelText(PHONE_LABEL), {
      target: { value: "3001234567" },
    })
    fireEvent.change(screen.getByLabelText(ADDRESS_LABEL), {
      target: { value: "Calle 123" },
    })
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete).toHaveBeenCalledWith({
      phone: "3001234567",
      address: "Calle 123",
      paymentMethod: "cash_on_delivery",
    })
  })
})

describe("AuthenticatedCheckoutForm prefill from the customer's last order", () => {
  it("renders empty phone and address fields when there is no last order", () => {
    renderAuthenticatedForm(vi.fn(), null)

    expect(screen.getByLabelText(PHONE_LABEL)).toHaveValue("")
    expect(screen.getByLabelText(ADDRESS_LABEL)).toHaveValue("")
  })

  it("prefills phone and address once the last order's data arrives", async () => {
    renderAuthenticatedForm(vi.fn(), {
      phone: "3005554444",
      address: "Avenida Siempre Viva 742",
    })

    await waitFor(() => expect(screen.getByLabelText(PHONE_LABEL)).toHaveValue("3005554444"))
    expect(screen.getByLabelText(ADDRESS_LABEL)).toHaveValue("Avenida Siempre Viva 742")
  })

  it("does not clobber a field the customer already edited when the prefill data arrives afterwards", async () => {
    const { rerenderWithPrefill } = renderAuthenticatedForm()

    fireEvent.change(screen.getByLabelText(PHONE_LABEL), { target: { value: "3001112222" } })

    rerenderWithPrefill({ phone: "3009998888", address: "Calle Prefill 42" })

    await waitFor(() => expect(screen.getByLabelText(ADDRESS_LABEL)).toHaveValue("Calle Prefill 42"))
    expect(screen.getByLabelText(PHONE_LABEL)).toHaveValue("3001112222")
  })
})
