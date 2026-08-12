import type { ComponentProps, ReactElement, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeActiveStoreAdmin,
  listDepartments,
  findClaimedDestinations,
  findMissingWeightProducts,
  listShippingZones,
  notFound,
  redirect,
} = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  listDepartments: vi.fn(),
  findClaimedDestinations: vi.fn(),
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
vi.mock("@/lib/supabase/shipping-zones-api", () => ({ findClaimedDestinations, findMissingWeightProducts, listShippingZones }))
vi.mock("next/navigation", () => ({ notFound, redirect }))
vi.mock("@/app/admin/settings/shipping/actions", () => ({
  saveShippingZoneAction,
  listShippingMunicipalitiesAction,
}))

import CreateShippingZonePage from "@/app/admin/settings/shipping/zones/new/page"
import EditShippingZonePage from "@/app/admin/settings/shipping/zones/[zoneId]/edit/page"
import { ZoneForm } from "@/app/admin/settings/shipping/components/zone-form"
import { findElementOfType } from "./_helpers/find-element-of-type"
import { ZONE } from "./_helpers/shipping-zone-fixture"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

function zoneFormOf(page: ReactNode) {
  return findElementOfType(page, ZoneForm) as ReactElement<ComponentProps<typeof ZoneForm>> | null
}

beforeEach(() => {
  vi.clearAllMocks()
  authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
  listDepartments.mockResolvedValue([])
  findClaimedDestinations.mockResolvedValue([])
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

  it("loads the store's claimed destinations with no zone excluded, since there is no zone yet", async () => {
    const claimed = [{ departmentCode: "05", municipalityCode: null, zoneName: "Zona Norte" }]
    findClaimedDestinations.mockResolvedValue(claimed)

    const page = await CreateShippingZonePage()
    const form = zoneFormOf(page)

    expect(findClaimedDestinations).toHaveBeenCalledWith(SERVICE, "store-1")
    expect(form?.props.claimedDestinations).toBe(claimed)
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

  it("loads claimed destinations excluding the zone being edited, so its own current destinations never show as claimed", async () => {
    await EditShippingZonePage({ params: Promise.resolve({ zoneId: ZONE.id }) })

    expect(findClaimedDestinations).toHaveBeenCalledWith(SERVICE, "store-1", ZONE.id)
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
