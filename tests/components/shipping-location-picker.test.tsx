import { fireEvent, render, screen } from "@testing-library/react"
import { createContext, createElement, useContext, useState, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// lib/shipping/locations-api.ts's listDepartments/listMunicipalitiesByDepartment
// both THROW on a Supabase error and reject on lib/supabase/with-timeout.ts's
// timeout. A department-list rejection must not leave the select empty with
// no way forward; a municipality-list rejection must not leave
// isLoadingMunicipalities stuck on (the buyer staring at "Cargando..."
// forever) -- both must end in an honest, retryable state instead.
const { listDepartments, listMunicipalitiesByDepartment } = vi.hoisted(() => ({
  listDepartments: vi.fn(),
  listMunicipalitiesByDepartment: vi.fn(),
}))

vi.mock("@/lib/shipping/locations-api", () => ({ listDepartments, listMunicipalitiesByDepartment }))

// Real (Radix) selects only mount their SelectContent when open, which
// requires jsdom pointer-capture polyfills this suite doesn't set up. Mirrors
// the mock used by tests/components/guest-checkout-form.test.tsx.
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
    return createElement("button", { type: "button", onClick: () => onValueChange?.(value) }, children)
  },
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => createElement("div", { id }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => createElement("span", {}, placeholder),
}))

import { ShippingLocationPicker, type ShippingLocationValue } from "@/components/shipping/shipping-location-picker"
import { LanguageProvider } from "@/contexts/language-context"

const EMPTY_VALUE: ShippingLocationValue = {
  departmentCode: "",
  departmentName: "",
  municipalityCode: "",
  municipalityId: "",
  municipalityName: "",
}

// A thin controlled-state wrapper, the same shape every real caller
// (guest/authenticated checkout, the address book) gives the picker.
function Harness() {
  const [value, setValue] = useState<ShippingLocationValue>(EMPTY_VALUE)
  return (
    <LanguageProvider>
      <ShippingLocationPicker value={value} onChange={setValue} />
    </LanguageProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ShippingLocationPicker rejection handling", () => {
  it("surfaces an honest error with a working retry when the department list fails to load", async () => {
    listDepartments
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([{ code: "05", name: "Antioquia" }])

    render(<Harness />)

    expect(await screen.findByText("No pudimos cargar los departamentos.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("Antioquia")).toBeInTheDocument()
    expect(listDepartments).toHaveBeenCalledTimes(2)
  })

  it("surfaces an honest error with a working retry when the municipality list fails to load, instead of loading forever", async () => {
    listDepartments.mockResolvedValue([{ code: "05", name: "Antioquia" }])
    listMunicipalitiesByDepartment
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([
        { id: 1, code: "05001", name: "Medellín", departmentCode: "05", departmentName: "Antioquia" },
      ])

    render(<Harness />)

    fireEvent.click(await screen.findByText("Antioquia"))

    expect(await screen.findByText("No pudimos cargar los municipios.")).toBeInTheDocument()
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("Medellín")).toBeInTheDocument()
    expect(listMunicipalitiesByDepartment).toHaveBeenCalledTimes(2)
  })
})
