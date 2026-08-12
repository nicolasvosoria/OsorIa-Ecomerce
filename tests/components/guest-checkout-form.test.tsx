import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createContext, createElement, useContext, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// D28: ShippingLocationPicker resolves departments/municipalities from
// lib/shipping/locations-api -- fixed here to one department and one
// municipality, same fixture as tests/components/authenticated-checkout-form.test.tsx.
vi.mock("@/lib/shipping/locations-api", () => ({
  listDepartments: vi.fn().mockResolvedValue([{ code: "05", name: "Antioquia" }]),
  listMunicipalitiesByDepartment: vi.fn().mockResolvedValue([
    { id: 1, code: "05001", name: "Medellín", departmentCode: "05", departmentName: "Antioquia" },
  ]),
}))

// Real (Radix) selects only mount their SelectContent when open, which
// requires jsdom pointer-capture polyfills this suite doesn't set up. Mirrors
// the mock used by tests/components/authenticated-checkout-form.test.tsx.
const SelectContext = createContext<{ onValueChange?: (value: string) => void }>({})

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode
    value?: string
    onValueChange?: (value: string) => void
  }) => createElement(SelectContext.Provider, { value: { onValueChange } }, children),
  SelectContent: ({ children }: { children: ReactNode }) => createElement("div", {}, children),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const { onValueChange } = useContext(SelectContext)
    return createElement(
      "button",
      { type: "button", onClick: () => onValueChange?.(value) },
      children,
    )
  },
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) =>
    createElement("div", { id }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => createElement("span", {}, placeholder),
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

// D28: picks the one department/municipality the locations-api mock serves,
// mirroring what a person does with the real two chained selects.
async function selectShippingLocation() {
  fireEvent.click(await screen.findByText("Antioquia"))
  fireEvent.click(await screen.findByText("Medellín"))
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
    await selectShippingLocation()
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "3001234567",
      address: "Calle 123",
      departmentCode: "05",
      departmentName: "Antioquia",
      city: "Medellín",
      municipalityCode: "05001",
      locationId: "1",
      paymentMethod: "cash_on_delivery",
    })
  })
})
