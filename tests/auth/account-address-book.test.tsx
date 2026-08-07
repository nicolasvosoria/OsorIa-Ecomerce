import { createElement, createContext, useContext, type ReactNode } from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultSavedAddress,
  toastError,
  toastSuccess,
} = vi.hoisted(() => ({
  createSavedAddress: vi.fn(),
  updateSavedAddress: vi.fn(),
  deleteSavedAddress: vi.fn(),
  setDefaultSavedAddress: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("@/app/auth/cuenta/actions", () => ({
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultSavedAddress,
  saveAccountProfile: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))

// D24: AddressForm embeds the same ShippingLocationPicker as the checkout
// (D28) -- two departments here (not just one) so the "edit" test can prove a
// picked destination really changes, not just re-pick the only option there is.
vi.mock("@/lib/shipping/locations-api", () => ({
  listDepartments: vi.fn().mockResolvedValue([
    { code: "05", name: "Antioquia" },
    { code: "76", name: "Valle del Cauca" },
  ]),
  listMunicipalitiesByDepartment: vi.fn((departmentCode: string) =>
    Promise.resolve(
      departmentCode === "76"
        ? [{ id: 2, code: "76001", name: "Cali", departmentCode: "76", departmentName: "Valle del Cauca" }]
        : [{ id: 1, code: "05001", name: "Medellín", departmentCode: "05", departmentName: "Antioquia" }],
    ),
  ),
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

import { AddressBook } from "@/app/auth/cuenta/address-book"
import { LanguageProvider } from "@/contexts/language-context"
import type { SavedAddress } from "@/lib/account/saved-address"
import { translations } from "@/lib/i18n/translations"

const t = translations.es

const HOME: SavedAddress = {
  id: "address-home",
  label: "Casa",
  addressLine1: "Calle 10 # 4-5",
  departmentCode: "05",
  departmentName: "Antioquia",
  city: "Medellín",
  municipalityCode: "05001",
  locationId: "1",
  postalCode: "110111",
  country: "Colombia",
  isDefault: true,
}

const OFFICE: SavedAddress = {
  id: "address-office",
  label: "Oficina",
  addressLine1: "Cra 7 # 32-16",
  departmentCode: "05",
  departmentName: "Antioquia",
  city: "Medellín",
  municipalityCode: "05001",
  locationId: "1",
  postalCode: null,
  country: "Colombia",
  isDefault: false,
}

const HOME_LINE = "Calle 10 # 4-5, Medellín, Antioquia, 110111, Colombia"
const OFFICE_LINE = "Cra 7 # 32-16, Medellín, Antioquia, Colombia"
// La sucesora aparece sin título propio, así que se nombra con su línea al lado.
const OFFICE_DESCRIBED = `Oficina (${OFFICE_LINE})`

function renderAddressBook(addresses: SavedAddress[]) {
  return render(
    <LanguageProvider>
      <AddressBook addresses={addresses} />
    </LanguageProvider>,
  )
}

function rowFor(address: SavedAddress): HTMLElement {
  const row = screen
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText(address.label ?? ""))

  if (!row) {
    throw new Error(`No se encontró la fila de la dirección ${address.label}`)
  }

  return row
}

function deleteTriggerFor(name: string): HTMLElement {
  return screen.getByRole("button", {
    name: t.account.deleteAddressNamed.replace("{name}", name),
  })
}

describe("AddressBook without saved addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Nadie llega aquí por un fallo: entrar sin direcciones es el primer caso
  // normal, así que se explica qué se gana al guardar la primera.
  it("invites the first address instead of showing an error or an empty list", () => {
    renderAddressBook([])

    expect(screen.getByText(t.account.addressesEmptyTitle)).toBeInTheDocument()
    expect(screen.getByText(t.account.addressesEmptyDescription)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: t.account.addAddress })).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
  })

  it("saves a brand new address with the country already filled in", async () => {
    const user = userEvent.setup()
    createSavedAddress.mockResolvedValue({ success: true })
    renderAddressBook([])

    await user.click(screen.getByRole("button", { name: t.account.addAddress }))
    await user.type(screen.getByLabelText(t.checkout.address), "Calle 10 # 4-5")
    await user.click(await screen.findByText("Antioquia"))
    await user.click(await screen.findByText("Medellín"))
    await user.click(screen.getByRole("button", { name: t.common.save }))

    await waitFor(() =>
      expect(createSavedAddress).toHaveBeenCalledWith({
        label: "",
        addressLine1: "Calle 10 # 4-5",
        departmentCode: "05",
        departmentName: "Antioquia",
        city: "Medellín",
        municipalityCode: "05001",
        locationId: "1",
        postalCode: "",
        country: "Colombia",
      }),
    )
    expect(toastSuccess).toHaveBeenCalledWith(t.account.addressSaved)
  })

  it("refuses to send an address with no street line", async () => {
    const user = userEvent.setup()
    renderAddressBook([])

    await user.click(screen.getByRole("button", { name: t.account.addAddress }))
    await user.type(screen.getByLabelText(t.account.addressNickname), "Casa")
    await user.click(screen.getByRole("button", { name: t.common.save }))

    expect(await screen.findByText(t.account.addressLineRequired)).toBeInTheDocument()
    expect(createSavedAddress).not.toHaveBeenCalled()
  })
})

describe("AddressBook with saved addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("marks exactly one address as the default one", () => {
    renderAddressBook([HOME, OFFICE])

    const badges = screen.getAllByText(t.account.defaultAddress)
    expect(badges).toHaveLength(1)
    expect(rowFor(HOME)).toContainElement(badges[0])
  })

  it("shows each saved address as one readable line", () => {
    renderAddressBook([HOME, OFFICE])

    expect(screen.getByText(HOME_LINE)).toBeInTheDocument()
    expect(screen.getByText(OFFICE_LINE)).toBeInTheDocument()
  })

  it("offers the switch only on the addresses that are not already default", () => {
    renderAddressBook([HOME, OFFICE])

    expect(within(rowFor(HOME)).queryByRole("button", { name: t.account.makeDefault })).toBeNull()
    expect(
      within(rowFor(OFFICE)).getByRole("button", { name: t.account.makeDefault }),
    ).toBeInTheDocument()
  })

  it("switches the default to the address the person picked", async () => {
    const user = userEvent.setup()
    setDefaultSavedAddress.mockResolvedValue({ success: true })
    renderAddressBook([HOME, OFFICE])

    await user.click(within(rowFor(OFFICE)).getByRole("button", { name: t.account.makeDefault }))

    await waitFor(() =>
      expect(setDefaultSavedAddress).toHaveBeenCalledWith({ addressId: OFFICE.id }),
    )
    expect(toastSuccess).toHaveBeenCalledWith(t.account.defaultAddressChanged)
  })

  it("edits the address the person picked, keeping its identity", async () => {
    const user = userEvent.setup()
    updateSavedAddress.mockResolvedValue({ success: true })
    renderAddressBook([HOME, OFFICE])

    await user.click(
      screen.getByRole("button", { name: t.account.editAddressNamed.replace("{name}", "Oficina") }),
    )
    expect(screen.getByLabelText(t.checkout.address)).toHaveValue(OFFICE.addressLine1)

    await user.click(await screen.findByText("Valle del Cauca"))
    await user.click(await screen.findByText("Cali"))
    await user.click(screen.getByRole("button", { name: t.common.save }))

    await waitFor(() =>
      expect(updateSavedAddress).toHaveBeenCalledWith({
        addressId: OFFICE.id,
        draft: expect.objectContaining({
          city: "Cali",
          departmentCode: "76",
          departmentName: "Valle del Cauca",
          addressLine1: OFFICE.addressLine1,
        }),
      }),
    )
  })

  // Borrar es irreversible: se confirma antes, y solo la confirmación escribe.
  it("asks before deleting and only then removes the address", async () => {
    const user = userEvent.setup()
    deleteSavedAddress.mockResolvedValue({ success: true })
    renderAddressBook([HOME, OFFICE])

    await user.click(deleteTriggerFor("Oficina"))
    expect(
      await screen.findByText(t.account.deleteAddressTitleNamed.replace("{name}", "Oficina")),
    ).toBeInTheDocument()
    expect(deleteSavedAddress).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: t.common.delete }))

    await waitFor(() => expect(deleteSavedAddress).toHaveBeenCalledWith({ addressId: OFFICE.id }))
    expect(toastSuccess).toHaveBeenCalledWith(t.account.addressDeleted)
  })

  it("names the reason the write failed instead of a generic message", async () => {
    const user = userEvent.setup()
    setDefaultSavedAddress.mockResolvedValue({
      success: false,
      error: "Esa dirección ya no existe en tu libreta.",
    })
    renderAddressBook([HOME, OFFICE])

    await user.click(within(rowFor(OFFICE)).getByRole("button", { name: t.account.makeDefault }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        t.account.saveFailed,
        expect.objectContaining({ description: "Esa dirección ya no existe en tu libreta." }),
      ),
    )
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("names an address that has no nickname instead of leaving the row blank", () => {
    renderAddressBook([{ ...OFFICE, label: null }])

    expect(screen.getByText(t.account.unlabeledAddress)).toBeInTheDocument()
    expect(deleteTriggerFor(t.account.unlabeledAddress)).toBeInTheDocument()
  })
})

// Borrar es irreversible y el backend asciende a otra predeterminada por su
// cuenta: la confirmación tiene que decir qué se va y qué queda en su lugar,
// porque después ya no hay dónde comprobarlo salvo el siguiente checkout.
describe("AddressBook delete confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteSavedAddress.mockResolvedValue({ success: true })
  })

  it("identifies the address it is about to delete, not just the trigger that opened it", async () => {
    const user = userEvent.setup()
    renderAddressBook([HOME, OFFICE])

    await user.click(deleteTriggerFor("Oficina"))

    expect(
      await screen.findByText(t.account.deleteAddressTitleNamed.replace("{name}", "Oficina")),
    ).toBeInTheDocument()
    expect(
      screen.getByText(t.account.deleteAddressDescription.replace("{address}", OFFICE_LINE)),
    ).toBeInTheDocument()
  })

  it("names the address that takes over checkout when the default one is deleted", async () => {
    const user = userEvent.setup()
    renderAddressBook([HOME, OFFICE])

    await user.click(deleteTriggerFor("Casa"))

    expect(
      await screen.findByText(
        t.account.deleteDefaultAddressDescription
          .replace("{address}", HOME_LINE)
          .replace("{successor}", OFFICE_DESCRIBED),
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: t.common.delete }))

    await waitFor(() => expect(deleteSavedAddress).toHaveBeenCalledWith({ addressId: HOME.id }))
    expect(toastSuccess).toHaveBeenCalledWith(
      t.account.defaultAddressDeleted.replace("{successor}", OFFICE_DESCRIBED),
    )
  })

  it("promises no successor when the deleted address is not the default one", async () => {
    const user = userEvent.setup()
    renderAddressBook([HOME, OFFICE])

    await user.click(deleteTriggerFor("Oficina"))
    await user.click(await screen.findByRole("button", { name: t.common.delete }))

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(t.account.addressDeleted))
  })

  it("promises no successor when the default one is the only address left", async () => {
    const user = userEvent.setup()
    renderAddressBook([HOME])

    await user.click(deleteTriggerFor("Casa"))

    expect(
      await screen.findByText(t.account.deleteAddressDescription.replace("{address}", HOME_LINE)),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: t.common.delete }))

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(t.account.addressDeleted))
  })

  // El disparador es rojo; confirmar no puede pintarse del color de marca de la
  // tienda, que en muchas es verde.
  it("gives the confirming action the destructive treatment, never the brand one", async () => {
    const user = userEvent.setup()
    renderAddressBook([HOME, OFFICE])

    await user.click(deleteTriggerFor("Oficina"))

    const confirm = await screen.findByRole("button", { name: t.common.delete })
    expect(confirm.className).toContain("bg-destructive")
    expect(confirm.className).not.toContain("bg-primary")
  })
})
