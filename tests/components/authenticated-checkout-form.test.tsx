import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createContext, createElement, useContext, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// D28: ShippingLocationPicker resolves departments/municipalities from
// lib/shipping/locations-api -- fixed here to one department and one
// municipality so every test can pick a real destination deterministically.
vi.mock("@/lib/shipping/locations-api", () => ({
  listDepartments: vi.fn().mockResolvedValue([{ code: "05", name: "Antioquia" }]),
  listMunicipalitiesByDepartment: vi.fn().mockResolvedValue([
    { id: 1, code: "05001", name: "Medellín", departmentCode: "05", departmentName: "Antioquia" },
  ]),
}))

// Real (Radix) selects only mount their SelectContent when open, which
// requires jsdom pointer-capture polyfills this suite doesn't set up.
// Mirrors the mock used by tests/security/admin-products-form-reset.test.tsx
// and tests/components/hero-layer-controls.test.tsx, extended with a context
// so SelectItem can reach its own Select's onValueChange -- this form renders
// two independent Selects (department, municipality) and each SelectItem must
// only ever drive its own.
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

import { AuthenticatedCheckoutForm } from "@/components/checkout/authenticated-checkout-form"
import type { CheckoutPrefill } from "@/app/checkout/actions"
import { LanguageProvider } from "@/contexts/language-context"
import type { UserProfile } from "@/lib/types/user"

const SUBMIT_LABEL = "Realizar pedido"
const FIRST_NAME_LABEL = "Nombre *"
const LAST_NAME_LABEL = "Apellido *"
const PHONE_LABEL = "Teléfono / Celular *"
const ADDRESS_LABEL = "Dirección de Envío *"

const ACCOUNT_USER: UserProfile = {
  id: "user-1",
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
}

const NAMELESS_ACCOUNT_USER: UserProfile = {
  id: "user-2",
  email: "sin-nombre@example.com",
  first_name: null,
  last_name: null,
}

const FULL_PREFILL: CheckoutPrefill = {
  phone: "3005554444",
  address: "Avenida Siempre Viva 742",
  departmentCode: "05",
  departmentName: "Antioquia",
  city: "Medellín",
  municipalityCode: "05001",
  locationId: "1",
}

function renderAuthenticatedForm(
  onComplete = vi.fn(),
  prefill?: CheckoutPrefill,
  user: UserProfile = ACCOUNT_USER,
) {
  const { rerender } = render(
    <LanguageProvider>
      <AuthenticatedCheckoutForm user={user} onComplete={onComplete} prefill={prefill} />
    </LanguageProvider>,
  )

  return {
    onComplete,
    rerenderWithPrefill: (nextPrefill: CheckoutPrefill) =>
      rerender(
        <LanguageProvider>
          <AuthenticatedCheckoutForm user={user} onComplete={onComplete} prefill={nextPrefill} />
        </LanguageProvider>,
      ),
  }
}

// D28: picks the one department/municipality the locations-api mock serves,
// mirroring what a person does with the real two chained selects.
async function selectShippingLocation() {
  fireEvent.click(await screen.findByText("Antioquia"))
  fireEvent.click(await screen.findByText("Medellín"))
}

describe("AuthenticatedCheckoutForm account data", () => {
  it("keeps the email read-only and prefills name inputs from the profile", async () => {
    renderAuthenticatedForm()

    expect(screen.getByText("ada@example.com")).toBeInTheDocument()
    expect(screen.getByLabelText(FIRST_NAME_LABEL)).toHaveValue("Ada")
    expect(screen.getByLabelText(LAST_NAME_LABEL)).toHaveValue("Lovelace")
    // Nombre, apellido, teléfono, dirección, código postal y país son
    // editables como Input; departamento y municipio son Select, no textbox.
    expect(screen.getAllByRole("textbox")).toHaveLength(6)
    // Deja resolver el fetch de departamentos del picker antes de terminar.
    await screen.findByText("Antioquia")
  })

  it("renders empty, editable name inputs when the profile has no name", async () => {
    renderAuthenticatedForm(vi.fn(), undefined, NAMELESS_ACCOUNT_USER)

    expect(screen.getByLabelText(FIRST_NAME_LABEL)).toHaveValue("")
    expect(screen.getByLabelText(LAST_NAME_LABEL)).toHaveValue("")
    await screen.findByText("Antioquia")
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

  it("blocks submit and shows required errors when the account has no name", async () => {
    renderAuthenticatedForm(vi.fn(), undefined, NAMELESS_ACCOUNT_USER)

    fireEvent.change(screen.getByLabelText(PHONE_LABEL), { target: { value: "3001234567" } })
    fireEvent.change(screen.getByLabelText(ADDRESS_LABEL), { target: { value: "Calle 123" } })
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    const firstName = await screen.findByLabelText(FIRST_NAME_LABEL)
    const lastName = screen.getByLabelText(LAST_NAME_LABEL)
    await waitFor(() => expect(firstName).toHaveAttribute("aria-invalid", "true"))
    expect(lastName).toHaveAttribute("aria-invalid", "true")

    expect(
      document.getElementById(firstName.getAttribute("aria-describedby") as string),
    ).toHaveTextContent("El nombre es requerido")
    expect(
      document.getElementById(lastName.getAttribute("aria-describedby") as string),
    ).toHaveTextContent("El apellido es requerido")
  })

  it("blocks submit while no department/municipality is picked", async () => {
    const { onComplete } = renderAuthenticatedForm()

    fireEvent.change(screen.getByLabelText(PHONE_LABEL), { target: { value: "3001234567" } })
    fireEvent.change(screen.getByLabelText(ADDRESS_LABEL), { target: { value: "Calle 123" } })
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    await waitFor(() =>
      expect(document.getElementById("shipping-department-error")).toHaveTextContent(
        "Selecciona un departamento",
      ),
    )
    expect(document.getElementById("shipping-municipality-error")).toHaveTextContent(
      "Selecciona un municipio",
    )
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("lets a nameless account fill in first and last name, pick a destination and submit successfully", async () => {
    const { onComplete } = renderAuthenticatedForm(vi.fn(), undefined, NAMELESS_ACCOUNT_USER)

    fireEvent.change(screen.getByLabelText(FIRST_NAME_LABEL), { target: { value: "Sin" } })
    fireEvent.change(screen.getByLabelText(LAST_NAME_LABEL), { target: { value: "Nombre" } })
    fireEvent.change(screen.getByLabelText(PHONE_LABEL), { target: { value: "3001234567" } })
    fireEvent.change(screen.getByLabelText(ADDRESS_LABEL), { target: { value: "Calle 123" } })
    await selectShippingLocation()
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete).toHaveBeenCalledWith({
      firstName: "Sin",
      lastName: "Nombre",
      phone: "3001234567",
      address: "Calle 123",
      departmentCode: "05",
      departmentName: "Antioquia",
      city: "Medellín",
      municipalityCode: "05001",
      locationId: "1",
      postalCode: "",
      country: "Colombia",
      paymentMethod: "cash_on_delivery",
    })
  })
})

describe("AuthenticatedCheckoutForm payment method section", () => {
  it("renders the enabled method from the registry and forwards the payload with the profile's name", async () => {
    const { onComplete } = renderAuthenticatedForm()

    expect(screen.getByRole("radio", { name: /Pago contra entrega/ })).toBeChecked()

    fireEvent.change(screen.getByLabelText(PHONE_LABEL), {
      target: { value: "3001234567" },
    })
    fireEvent.change(screen.getByLabelText(ADDRESS_LABEL), {
      target: { value: "Calle 123" },
    })
    await selectShippingLocation()
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete).toHaveBeenCalledWith({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "3001234567",
      address: "Calle 123",
      departmentCode: "05",
      departmentName: "Antioquia",
      city: "Medellín",
      municipalityCode: "05001",
      locationId: "1",
      postalCode: "",
      country: "Colombia",
      paymentMethod: "cash_on_delivery",
    })
  })
})

describe("AuthenticatedCheckoutForm prefill from the saved default address", () => {
  it("renders empty phone and address fields when there is no prefill", async () => {
    renderAuthenticatedForm(vi.fn(), null)

    expect(screen.getByLabelText(PHONE_LABEL)).toHaveValue("")
    expect(screen.getByLabelText(ADDRESS_LABEL)).toHaveValue("")
    await screen.findByText("Antioquia")
  })

  // D24: la dirección predeterminada de la libreta precarga tanto el texto
  // (teléfono, dirección) como el destino estructurado (departamento,
  // municipio) -- sometemos el formulario SIN volver a elegir el picker para
  // probar que el destino precargado es lo que de verdad llega en el envío.
  it("prefills phone, address and the destination once the saved address arrives, and submits it unchanged", async () => {
    const { onComplete } = renderAuthenticatedForm(vi.fn(), FULL_PREFILL)

    await waitFor(() => expect(screen.getByLabelText(PHONE_LABEL)).toHaveValue("3005554444"))
    expect(screen.getByLabelText(ADDRESS_LABEL)).toHaveValue("Avenida Siempre Viva 742")

    fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentCode: "05",
        departmentName: "Antioquia",
        city: "Medellín",
        municipalityCode: "05001",
        locationId: "1",
      }),
    )
  })

  it("does not clobber a field the customer already edited when the prefill data arrives afterwards", async () => {
    const { rerenderWithPrefill } = renderAuthenticatedForm()

    fireEvent.change(screen.getByLabelText(PHONE_LABEL), { target: { value: "3001112222" } })

    rerenderWithPrefill({ ...FULL_PREFILL, phone: "3009998888", address: "Calle Prefill 42" })

    await waitFor(() => expect(screen.getByLabelText(ADDRESS_LABEL)).toHaveValue("Calle Prefill 42"))
    expect(screen.getByLabelText(PHONE_LABEL)).toHaveValue("3001112222")
  })
})
