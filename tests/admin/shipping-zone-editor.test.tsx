import { render, screen } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { deleteShippingZoneAction, updateUnmatchedDestinationActionAction, routerRefresh } = vi.hoisted(() => ({
  deleteShippingZoneAction: vi.fn(),
  updateUnmatchedDestinationActionAction: vi.fn(),
  routerRefresh: vi.fn(),
}))

vi.mock("@/app/admin/settings/shipping/actions", () => ({
  deleteShippingZoneAction,
  updateUnmatchedDestinationActionAction,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}))

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub
})

import { ShippingZonesSection } from "@/app/admin/settings/shipping/components/zone-editor"
import { translations } from "@/lib/i18n/translations"
import type { ShippingZoneDestinationView, ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"

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

function destinationsInDepartment(departmentName: string, count: number): ShippingZoneDestinationView[] {
  return Array.from({ length: count }, (_, index) => ({
    departmentCode: "05",
    departmentName,
    municipalityCode: `0500${index + 1}`,
    municipalityName: `Municipio ${index + 1}`,
  }))
}

const ZONE_WITH_MANY_DESTINATIONS: ShippingZoneRecord = {
  ...ZONE,
  id: "zone-2",
  destinations: destinationsInDepartment("ANTIOQUIA", 5),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ShippingZonesSection", () => {
  it("shows the empty state when the store has no zones yet", () => {
    render(<ShippingZonesSection mode="own_rates" zones={[]} unmatchedDestinationAction="block" />)

    expect(screen.getByText(/Agrega una zona/)).toBeInTheDocument()
  })

  it("renders both the empty state's title and its description", () => {
    render(<ShippingZonesSection mode="own_rates" zones={[]} unmatchedDestinationAction="block" />)

    expect(screen.getByText(translations.es.shipping.zones.emptyTitle)).toBeInTheDocument()
    expect(screen.getByText(translations.es.shipping.zones.emptyDescription)).toBeInTheDocument()
  })

  it("lists an existing zone with its destination and its rate basis", () => {
    render(<ShippingZonesSection mode="own_rates" zones={[ZONE]} unmatchedDestinationAction="block" />)

    expect(screen.getByText("Eje Cafetero")).toBeInTheDocument()
    expect(screen.getByText("MEDELLÍN")).toBeInTheDocument()
    expect(screen.getByText("Por valor del pedido")).toBeInTheDocument()
  })

  it("caps a zone's visible destination badges at three and labels the rest", () => {
    render(<ShippingZonesSection mode="own_rates" zones={[ZONE_WITH_MANY_DESTINATIONS]} unmatchedDestinationAction="block" />)

    expect(screen.getByText("Municipio 1")).toBeInTheDocument()
    expect(screen.getByText("Municipio 2")).toBeInTheDocument()
    expect(screen.getByText("Municipio 3")).toBeInTheDocument()
    expect(screen.queryByText("Municipio 4")).not.toBeInTheDocument()
    expect(screen.queryByText("Municipio 5")).not.toBeInTheDocument()
    expect(screen.getByText("+2 más")).toBeInTheDocument()
  })

  it("sends 'Agregar zona' to its own creation screen instead of opening a dialog", () => {
    render(<ShippingZonesSection mode="own_rates" zones={[]} unmatchedDestinationAction="block" />)

    expect(screen.getByRole("link", { name: /Agregar zona/ })).toHaveAttribute(
      "href",
      "/admin/settings/shipping/zones/new",
    )
  })

  it("sends each row's edit action to its own edit screen instead of opening a dialog", () => {
    render(<ShippingZonesSection mode="own_rates" zones={[ZONE]} unmatchedDestinationAction="block" />)

    expect(screen.getByRole("link", { name: /Editar zona de envío/ })).toHaveAttribute(
      "href",
      `/admin/settings/shipping/zones/${ZONE.id}/edit`,
    )
  })

  it("replaces the zones-and-rates apparatus with a WhatsApp explanation in coordinate mode", () => {
    render(<ShippingZonesSection mode="coordinate" zones={[ZONE]} unmatchedDestinationAction="block" />)

    expect(screen.getByText(translations.es.shipping.zones.coordinateModeTitle)).toBeInTheDocument()
    expect(screen.queryByText(translations.es.shipping.zones.sectionTitle)).not.toBeInTheDocument()
    expect(screen.queryByText(translations.es.shipping.zones.unmatchedDestinationTitle)).not.toBeInTheDocument()
    expect(screen.queryByText("Eje Cafetero")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: translations.es.shipping.zones.coordinateModeCta })).toHaveAttribute(
      "href",
      "#shipping-mode",
    )
  })

  it("still shows the zones apparatus for an own_rates store", () => {
    render(<ShippingZonesSection mode="own_rates" zones={[ZONE]} unmatchedDestinationAction="block" />)

    expect(screen.getByText(translations.es.shipping.zones.sectionTitle)).toBeInTheDocument()
    expect(screen.getByText(translations.es.shipping.zones.unmatchedDestinationTitle)).toBeInTheDocument()
    expect(screen.queryByText(translations.es.shipping.zones.coordinateModeTitle)).not.toBeInTheDocument()
  })
})
