import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, listDepartments, findMissingWeightProducts, listShippingZones, notFound, redirect } =
  vi.hoisted(() => ({
    authorizeActiveStoreAdmin: vi.fn(),
    listDepartments: vi.fn(),
    findMissingWeightProducts: vi.fn(),
    listShippingZones: vi.fn(),
    notFound: vi.fn(),
    redirect: vi.fn(),
  }))

const { saveShippingZoneAction, listShippingMunicipalitiesAction } = vi.hoisted(() => ({
  saveShippingZoneAction: vi.fn(),
  listShippingMunicipalitiesAction: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/shipping/locations-api", () => ({ listDepartments }))
vi.mock("@/lib/supabase/shipping-zones-api", () => ({ findMissingWeightProducts, listShippingZones }))
vi.mock("next/navigation", () => ({ notFound, redirect }))
vi.mock("@/app/admin/settings/shipping/actions", () => ({
  saveShippingZoneAction,
  listShippingMunicipalitiesAction,
}))

import CreateShippingZonePage from "@/app/admin/settings/shipping/zones/new/page"
import EditShippingZonePage from "@/app/admin/settings/shipping/zones/[zoneId]/edit/page"
import { ZoneForm } from "@/app/admin/settings/shipping/components/zone-form"
import type { ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const ZONE: ShippingZoneRecord = {
  id: "zone-1",
  name: "Eje Cafetero",
  destinations: [
    { departmentCode: "05", departmentName: "ANTIOQUIA", municipalityCode: "05001", municipalityName: "MEDELLÍN" },
  ],
  rateLadder: { basis: "flat", amount: "5000" },
}

function findElementOfType(node: ReactNode, type: unknown): ReactElement | null {
  if (!isValidElement(node)) return null
  if (node.type === type) return node

  const children = (node.props as { children?: ReactNode }).children
  for (const child of Children.toArray(children)) {
    const found = findElementOfType(child, type)
    if (found) return found
  }
  return null
}

function zoneFormOf(page: ReactNode) {
  return findElementOfType(page, ZoneForm) as ReactElement<ComponentProps<typeof ZoneForm>> | null
}

beforeEach(() => {
  vi.clearAllMocks()
  authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
  listDepartments.mockResolvedValue([])
  findMissingWeightProducts.mockResolvedValue([])
  listShippingZones.mockResolvedValue([ZONE])
})

describe("CreateShippingZonePage", () => {
  it("opens an empty form with no zone to pre-fill from", async () => {
    const page = await CreateShippingZonePage()
    const form = zoneFormOf(page)

    expect(form?.props.zoneId).toBeNull()
    expect(form?.props.zone).toBeNull()
  })

  it("redirects instead of loading when the active store admin gate denies access", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(CreateShippingZonePage()).rejects.toThrow("NEXT_REDIRECT")
    expect(redirect).toHaveBeenCalledWith("/")
  })
})

describe("EditShippingZonePage", () => {
  it("loads the zone named by the route, not the first one of the store, and hands its id to the form", async () => {
    const page = await EditShippingZonePage({ params: Promise.resolve({ zoneId: ZONE.id }) })
    const form = zoneFormOf(page)

    expect(form?.props.zoneId).toBe(ZONE.id)
    expect(form?.props.zone).toBe(ZONE)
    expect(notFound).not.toHaveBeenCalled()
  })

  it("scopes the lookup to the active store with the granted client", async () => {
    await EditShippingZonePage({ params: Promise.resolve({ zoneId: ZONE.id }) })

    expect(listShippingZones).toHaveBeenCalledWith(SERVICE, "store-1")
  })

  it("404s on a zoneId outside the active store instead of opening a blank form", async () => {
    listShippingZones.mockResolvedValue([])
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND")
    })

    await expect(
      EditShippingZonePage({ params: Promise.resolve({ zoneId: ZONE.id }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
