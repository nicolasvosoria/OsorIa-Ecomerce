import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { useForm } from "react-hook-form"

const {
  saveShippingZoneAction,
  deleteShippingZoneAction,
  listShippingDepartmentsAction,
  listShippingMunicipalitiesAction,
  updateUnmatchedDestinationActionAction,
  routerRefresh,
} = vi.hoisted(() => ({
  saveShippingZoneAction: vi.fn(),
  deleteShippingZoneAction: vi.fn(),
  listShippingDepartmentsAction: vi.fn(),
  listShippingMunicipalitiesAction: vi.fn(),
  updateUnmatchedDestinationActionAction: vi.fn(),
  routerRefresh: vi.fn(),
}))

vi.mock("@/app/admin/settings/shipping/actions", () => ({
  saveShippingZoneAction,
  deleteShippingZoneAction,
  listShippingDepartmentsAction,
  listShippingMunicipalitiesAction,
  updateUnmatchedDestinationActionAction,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}))

// jsdom doesn't implement ResizeObserver; the Radix Dialog/Select/Popover
// this screen carries measure themselves as soon as they mount (same stub
// tests/admin/product-form.test.tsx already needs for its own Radix fields).
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub
})

import { ShippingZonesSection } from "@/app/admin/settings/shipping/components/zone-editor"
import { RateLadderField } from "@/app/admin/settings/shipping/components/rate-ladder-field"
import type { ZoneEditorFormValues } from "@/lib/shipping/schemas"
import type { MissingWeightProduct, ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"

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

beforeEach(() => {
  vi.clearAllMocks()
  listShippingDepartmentsAction.mockResolvedValue([])
})

describe("ShippingZonesSection", () => {
  it("shows the empty state when the store has no zones yet", () => {
    render(<ShippingZonesSection zones={[]} missingWeightProducts={[]} unmatchedDestinationAction="block" />)

    expect(screen.getByText(/Agrega una zona/)).toBeInTheDocument()
  })

  it("lists an existing zone with its destination and its rate basis", () => {
    render(<ShippingZonesSection zones={[ZONE]} missingWeightProducts={[]} unmatchedDestinationAction="block" />)

    expect(screen.getByText("Eje Cafetero")).toBeInTheDocument()
    expect(screen.getByText("MEDELLÍN")).toBeInTheDocument()
    expect(screen.getByText("Por valor del pedido")).toBeInTheDocument()
  })

  it("opens the editor with the zone's current name pre-filled", async () => {
    render(<ShippingZonesSection zones={[ZONE]} missingWeightProducts={[]} unmatchedDestinationAction="block" />)

    fireEvent.click(screen.getAllByRole("button", { name: /Editar zona de envío/ })[0])

    expect(await screen.findByDisplayValue("Eje Cafetero")).toBeInTheDocument()
  })

  // Round-3 fix: the dialog's create-vs-edit decision has to survive `zones`
  // no longer containing the zone being edited (e.g. a server refresh landed
  // while the dialog stayed open) -- ZoneForm used to re-derive the id from
  // the (now missing) zone record and would have submitted a CREATE instead
  // of the intended edit.
  it("still submits an EDIT of the original zone when it drops out of the zones list while the dialog stays open", async () => {
    saveShippingZoneAction.mockResolvedValue({ success: true })

    const { rerender } = render(
      <ShippingZonesSection zones={[ZONE]} missingWeightProducts={[]} unmatchedDestinationAction="block" />,
    )

    fireEvent.click(screen.getAllByRole("button", { name: /Editar zona de envío/ })[0])
    await screen.findByDisplayValue("Eje Cafetero")

    rerender(<ShippingZonesSection zones={[]} missingWeightProducts={[]} unmatchedDestinationAction="block" />)

    fireEvent.click(screen.getByRole("button", { name: "Guardar zona" }))

    await waitFor(() => expect(saveShippingZoneAction).toHaveBeenCalled())
    expect(saveShippingZoneAction.mock.calls[0][1]).toBe(ZONE.id)
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
describe("ShippingZonesSection ladder validation on save (P0)", () => {
  it("flags the exact row field and blocks the save when a ladder amount is blank", async () => {
    render(<ShippingZonesSection zones={[ZONE]} missingWeightProducts={[]} unmatchedDestinationAction="block" />)

    fireEvent.click(screen.getAllByRole("button", { name: /Editar zona de envío/ })[0])
    await screen.findByDisplayValue("Eje Cafetero")

    const amountInputs = screen.getAllByLabelText("Monto")
    fireEvent.change(amountInputs[0], { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar zona" }))

    await waitFor(() => expect(amountInputs[0]).toHaveAttribute("aria-invalid", "true"))
    expect(await screen.findByText("El monto no puede ser negativo")).toBeInTheDocument()
    expect(saveShippingZoneAction).not.toHaveBeenCalled()
  })
})
