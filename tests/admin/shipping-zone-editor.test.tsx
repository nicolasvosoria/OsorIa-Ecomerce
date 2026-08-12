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
import type { ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"

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
})

describe("ShippingZonesSection", () => {
  it("shows the empty state when the store has no zones yet", () => {
    render(<ShippingZonesSection zones={[]} unmatchedDestinationAction="block" />)

    expect(screen.getByText(/Agrega una zona/)).toBeInTheDocument()
  })

  it("lists an existing zone with its destination and its rate basis", () => {
    render(<ShippingZonesSection zones={[ZONE]} unmatchedDestinationAction="block" />)

    expect(screen.getByText("Eje Cafetero")).toBeInTheDocument()
    expect(screen.getByText("MEDELLÍN")).toBeInTheDocument()
    expect(screen.getByText("Por valor del pedido")).toBeInTheDocument()
  })

  it("sends 'Agregar zona' to its own creation screen instead of opening a dialog", () => {
    render(<ShippingZonesSection zones={[]} unmatchedDestinationAction="block" />)

    expect(screen.getByRole("link", { name: /Agregar zona/ })).toHaveAttribute(
      "href",
      "/admin/settings/shipping/zones/new",
    )
  })

  it("sends each row's edit action to its own edit screen instead of opening a dialog", () => {
    render(<ShippingZonesSection zones={[ZONE]} unmatchedDestinationAction="block" />)

    expect(screen.getByRole("link", { name: /Editar zona de envío/ })).toHaveAttribute(
      "href",
      `/admin/settings/shipping/zones/${ZONE.id}/edit`,
    )
  })
})
