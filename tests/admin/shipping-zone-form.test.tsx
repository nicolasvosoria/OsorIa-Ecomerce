import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { useForm } from "react-hook-form"

const { saveShippingZoneAction, listShippingMunicipalitiesAction, searchShippingMunicipalitiesAction, routerPush } =
  vi.hoisted(() => ({
    saveShippingZoneAction: vi.fn(),
    listShippingMunicipalitiesAction: vi.fn(),
    searchShippingMunicipalitiesAction: vi.fn(),
    routerPush: vi.fn(),
  }))

vi.mock("@/app/admin/settings/shipping/actions", () => ({
  saveShippingZoneAction,
  listShippingMunicipalitiesAction,
  searchShippingMunicipalitiesAction,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}))

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub
})

import { ZoneForm } from "@/app/admin/settings/shipping/components/zone-form"
import { RateLadderField } from "@/app/admin/settings/shipping/components/rate-ladder-field"
import type { Department } from "@/lib/shipping/locations-api"
import type { ZoneEditorFormValues } from "@/lib/shipping/schemas"
import type { ClaimedDestination, MissingWeightProduct, ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"

const ZONE: ShippingZoneRecord = {
  id: "zone-1",
  name: "Eje Cafetero",
  destinations: [
    { departmentCode: "05", departmentName: "ANTIOQUIA", municipalityCode: "05001", municipalityName: "MEDELLÍN" },
  ],
  rateLadder: {
    basis: "order_value",
    ranges: [
      { from: "0", to: "50000", amount: "5000" },
      { from: "50000", to: "", amount: "0" },
    ],
  },
}

const DEPARTMENTS: Department[] = [
  { code: "05", name: "ANTIOQUIA" },
  { code: "76", name: "VALLE DEL CAUCA" },
]

beforeEach(() => {
  vi.clearAllMocks()
  listShippingMunicipalitiesAction.mockResolvedValue([])
  searchShippingMunicipalitiesAction.mockResolvedValue([])
})

describe("ZoneForm", () => {
  it("pre-fills the zone's current name when editing", () => {
    render(<ZoneForm zoneId={ZONE.id} zone={ZONE} departments={[]} missingWeightProducts={[]} />)

    expect(screen.getByDisplayValue("Eje Cafetero")).toBeInTheDocument()
  })

  it("submits a CREATE through saveShippingZoneAction when zoneId is null", async () => {
    saveShippingZoneAction.mockResolvedValue({ success: true })
    render(<ZoneForm zoneId={null} zone={ZONE} departments={[]} missingWeightProducts={[]} />)

    fireEvent.click(screen.getByRole("button", { name: "Guardar zona" }))

    await waitFor(() => expect(saveShippingZoneAction).toHaveBeenCalled())
    expect(saveShippingZoneAction.mock.calls[0][1]).toBeUndefined()
  })

  it("preserves the old dialog's create-vs-edit regression: submits an EDIT of the given zoneId, never a value derived from the zone record", async () => {
    saveShippingZoneAction.mockResolvedValue({ success: true })
    render(<ZoneForm zoneId="zone-route-param" zone={ZONE} departments={[]} missingWeightProducts={[]} />)

    fireEvent.click(screen.getByRole("button", { name: "Guardar zona" }))

    await waitFor(() => expect(saveShippingZoneAction).toHaveBeenCalled())
    expect(saveShippingZoneAction.mock.calls[0][1]).toBe("zone-route-param")
  })
})

describe("ZoneForm destinations picker", () => {
  it("renders a destination already claimed by another zone as disabled, naming the owning zone", () => {
    const claimedDestinations: ClaimedDestination[] = [
      { departmentCode: "05", municipalityCode: null, zoneName: "Costa Caribe" },
    ]
    render(
      <ZoneForm
        zoneId={null}
        zone={null}
        departments={DEPARTMENTS}
        missingWeightProducts={[]}
        claimedDestinations={claimedDestinations}
      />,
    )

    expect(screen.getByText('Ya asignado a la zona "Costa Caribe"')).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "ANTIOQUIA" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "VALLE DEL CAUCA" })).toBeEnabled()
  })

  it("selects every department at once with 'Seleccionar todos', and clears everything with 'Limpiar'", () => {
    render(<ZoneForm zoneId={null} zone={null} departments={DEPARTMENTS} missingWeightProducts={[]} />)

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar todos" }))

    expect(screen.getByRole("checkbox", { name: "ANTIOQUIA" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "VALLE DEL CAUCA" })).toBeChecked()
    expect(screen.getByText("2 destinos seleccionados")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }))

    expect(screen.getByRole("checkbox", { name: "ANTIOQUIA" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "VALLE DEL CAUCA" })).not.toBeChecked()
    expect(screen.getByText("0 destinos seleccionados")).toBeInTheDocument()
  })

  it("skips a department already claimed whole by another zone when 'Seleccionar todos' runs", () => {
    const claimedDestinations: ClaimedDestination[] = [
      { departmentCode: "05", municipalityCode: null, zoneName: "Costa Caribe" },
    ]
    render(
      <ZoneForm
        zoneId={null}
        zone={null}
        departments={DEPARTMENTS}
        missingWeightProducts={[]}
        claimedDestinations={claimedDestinations}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar todos" }))

    expect(screen.getByRole("checkbox", { name: "ANTIOQUIA" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "VALLE DEL CAUCA" })).toBeChecked()
  })

  it("selecting a whole department clears its municipios selected individually, so the two can never coexist for the same department", async () => {
    listShippingMunicipalitiesAction.mockResolvedValue([
      { id: 1, code: "05001", name: "MEDELLÍN", departmentCode: "05", departmentName: "ANTIOQUIA" },
      { id: 2, code: "05002", name: "ABEJORRAL", departmentCode: "05", departmentName: "ANTIOQUIA" },
    ])
    saveShippingZoneAction.mockResolvedValue({ success: true })
    render(<ZoneForm zoneId={null} zone={null} departments={DEPARTMENTS} missingWeightProducts={[]} />)

    fireEvent.click(screen.getAllByRole("button", { name: "Ver municipios" })[0])
    await screen.findByRole("checkbox", { name: "MEDELLÍN" })
    fireEvent.click(screen.getByRole("checkbox", { name: "MEDELLÍN" }))
    expect(screen.getByRole("checkbox", { name: "MEDELLÍN" })).toBeChecked()

    fireEvent.click(screen.getByRole("checkbox", { name: "ANTIOQUIA" }))

    expect(screen.getByRole("checkbox", { name: "ANTIOQUIA" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "MEDELLÍN" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "MEDELLÍN" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "ABEJORRAL" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "ABEJORRAL" })).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Nombre de la zona"), { target: { value: "Zona Test" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar zona" }))

    await waitFor(() => expect(saveShippingZoneAction).toHaveBeenCalled())
    expect(saveShippingZoneAction.mock.calls[0][0].destinations).toEqual([{ departmentCode: "05", municipalityCode: null }])
  })

  it("finds a municipio through the global search, disambiguated by department, and adds it on select", async () => {
    searchShippingMunicipalitiesAction.mockResolvedValue([
      { id: 3, code: "76001", name: "CALI", departmentCode: "76", departmentName: "VALLE DEL CAUCA" },
    ])
    render(<ZoneForm zoneId={null} zone={null} departments={DEPARTMENTS} missingWeightProducts={[]} />)

    fireEvent.click(screen.getByText("Buscar municipio…"))
    fireEvent.change(screen.getByPlaceholderText("Buscar municipio…"), { target: { value: "cali" } })

    await waitFor(() => expect(searchShippingMunicipalitiesAction).toHaveBeenCalledWith("cali"), { timeout: 2000 })
    const result = await screen.findByText("CALI (VALLE DEL CAUCA)")
    fireEvent.click(result)

    expect(screen.getByText("1 destinos seleccionados")).toBeInTheDocument()
  })
})

function RateLadderHarness({
  basis = "order_value",
  ranges = [{ from: "0", to: "", amount: "" }],
  missingWeightProducts = [],
}: {
  basis?: "flat" | "order_value" | "weight"
  ranges?: { from: string; to: string; amount: string }[]
  missingWeightProducts?: MissingWeightProduct[]
}) {
  const { control } = useForm<ZoneEditorFormValues>({
    defaultValues: {
      name: "",
      destinations: [],
      rateLadder: { basis, amount: "0", ranges },
    },
  })

  return <RateLadderField control={control} missingWeightProducts={missingWeightProducts} />
}

describe("RateLadderField", () => {
  it("adds and removes range rows", () => {
    render(<RateLadderHarness />)

    expect(screen.getAllByLabelText("Desde")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: /Agregar rango/ }))
    expect(screen.getAllByLabelText("Desde")).toHaveLength(2)

    fireEvent.click(screen.getAllByRole("button", { name: "Quitar rango" })[0])
    expect(screen.getAllByLabelText("Desde")).toHaveLength(1)
  })

  it("cannot remove the last remaining range row", () => {
    render(<RateLadderHarness />)

    expect(screen.getByRole("button", { name: "Quitar rango" })).toBeDisabled()
  })

  it("warns when the ladder does not reach an open-ended last rung (D6's no-gaps rule)", () => {
    render(<RateLadderHarness />)

    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "50000" } })
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "5000" } })

    expect(screen.getByText(/último rango/)).toBeInTheDocument()
  })

  it("warns about an overlap when two ranges cover the same order-value band", () => {
    render(
      <RateLadderHarness
        ranges={[
          { from: "0", to: "30000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ]}
      />,
    )

    expect(screen.getByText(/superponen/)).toBeInTheDocument()
  })

  // Isolated from any other fixture: pins the half-open boundary semantics
  // (a shared endpoint is neither a gap nor an overlap) as its own case.
  it("shows no warning when two ranges touch exactly at the boundary", () => {
    render(
      <RateLadderHarness
        ranges={[
          { from: "0", to: "20000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ]}
      />,
    )

    expect(screen.queryByText(/superponen/)).not.toBeInTheDocument()
    expect(screen.queryByText(/vacío/)).not.toBeInTheDocument()
    expect(screen.queryByText(/último rango/)).not.toBeInTheDocument()
  })

  it("says nothing about missing weight for a non-weight basis, even with products missing it", () => {
    render(<RateLadderHarness basis="order_value" missingWeightProducts={[{ id: "item-1", name: "Café Especial" }]} />)

    expect(screen.queryByText("Faltan productos con peso cargado")).not.toBeInTheDocument()
  })

  it("lists products missing weight, with a link to each, for the weight basis (D8)", () => {
    render(<RateLadderHarness basis="weight" missingWeightProducts={[{ id: "item-1", name: "Café Especial" }]} />)

    expect(screen.getByText("Faltan productos con peso cargado")).toBeInTheDocument()
    expect(screen.getByText(/Café Especial/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Editar producto" })).toHaveAttribute("href", "/admin/products/item-1/edit")
  })

  // P1: nothing anywhere used to say a 0 amount means free shipping.
  it("hints that a 0 Monto means free shipping for that range", () => {
    render(<RateLadderHarness />)

    expect(
      screen.getByText("Un rango con Monto en 0 es envío gratis para ese tramo."),
    ).toBeInTheDocument()
  })

  // P1: the row used to be a fixed 4-column grid with no breakpoint.
  it("stacks a range row into two columns on narrow screens and back to four at sm", () => {
    render(<RateLadderHarness />)

    const rowContainer = screen.getByLabelText("Desde").closest("div")?.parentElement
    expect(rowContainer).toHaveClass("grid-cols-2")
    expect(rowContainer).toHaveClass("sm:grid-cols-[1fr_1fr_1fr_auto]")
  })

  // P0 (second half) + P1: the live gap/overlap indicator used to disappear
  // the instant any row's amount was blank, and only ever showed the FIRST
  // issue with the same neutral weight as an informational notice.
  it("shows every gap/overlap issue as a destructive alert, surviving a still-blank row amount", () => {
    render(
      <RateLadderHarness
        ranges={[
          { from: "10000", to: "30000", amount: "" },
          { from: "20000", to: "", amount: "0" },
        ]}
      />,
    )

    expect(screen.getByText(/primer rango/)).toBeInTheDocument()
    expect(screen.getByText(/superponen/)).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveClass("text-destructive")
  })
})

// P0: looseRateLadderFieldSchema never validates the ladder, so a blank or
// invalid row only ever surfaces on submit -- these pin that it now lands on
// the exact field RateLadderField renders, not just a generic toast.
describe("ZoneForm ladder validation on save (P0)", () => {
  it("flags the exact row field and blocks the save when a ladder amount is blank", async () => {
    render(<ZoneForm zoneId={ZONE.id} zone={ZONE} departments={[]} missingWeightProducts={[]} />)

    const amountInputs = screen.getAllByLabelText("Monto")
    fireEvent.change(amountInputs[0], { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar zona" }))

    await waitFor(() => expect(amountInputs[0]).toHaveAttribute("aria-invalid", "true"))
    expect(await screen.findByText("El monto no puede ser negativo")).toBeInTheDocument()
    expect(saveShippingZoneAction).not.toHaveBeenCalled()
  })
})
