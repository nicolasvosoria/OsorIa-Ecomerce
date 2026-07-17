import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { GuestCheckoutForm } from "@/components/checkout/guest-checkout-form"
import { LanguageProvider } from "@/contexts/language-context"

const SUBMIT_LABEL = "Realizar pedido"

function renderGuestForm(onComplete = vi.fn()) {
  render(
    <LanguageProvider>
      <GuestCheckoutForm onComplete={onComplete} />
    </LanguageProvider>,
  )
  return onComplete
}

function fillRequiredContactAndAddressFields() {
  fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Ada" } })
  fireEvent.change(screen.getByLabelText("Apellido *"), { target: { value: "Lovelace" } })
  fireEvent.change(screen.getByLabelText("Correo Electrónico *"), {
    target: { value: "ada@example.com" },
  })
  fireEvent.change(screen.getByLabelText("Teléfono *"), { target: { value: "3001234567" } })
  fireEvent.change(screen.getByLabelText("Dirección *"), { target: { value: "Calle 123" } })
}

describe("GuestCheckoutForm field validation", () => {
  it("marks an empty required field invalid and points it at the schema's message", async () => {
    renderGuestForm()

    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    const email = await screen.findByLabelText("Correo Electrónico *")
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"))

    const errorId = email.getAttribute("aria-describedby")
    expect(document.getElementById(errorId as string)).toHaveTextContent(
      "El correo electrónico no es válido",
    )
  })

  it("leaves a valid field unmarked once corrected", async () => {
    renderGuestForm()

    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))
    const phone = await screen.findByLabelText("Teléfono *")
    await waitFor(() => expect(phone).toHaveAttribute("aria-invalid", "true"))

    fireEvent.change(phone, { target: { value: "3001234567" } })
    await waitFor(() => expect(phone).not.toHaveAttribute("aria-invalid"))
  })
})

describe("GuestCheckoutForm payment method section", () => {
  it("renders the enabled method from the registry and forwards it in the payload", async () => {
    const onComplete = renderGuestForm()

    const radio = screen.getByRole("radio", { name: /Pago contra entrega/ })
    expect(radio).toBeChecked()
    expect(screen.getByText("Paga en efectivo cuando recibas tu pedido")).toBeInTheDocument()

    fillRequiredContactAndAddressFields()
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "3001234567",
      address: "Calle 123",
      paymentMethod: "cash_on_delivery",
    })
  })
})
