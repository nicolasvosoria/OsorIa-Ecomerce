import { beforeEach, describe, expect, it, vi } from "vitest"

// D27: getCheckoutShippingQuote (the live checkout preview) is the only door
// into shipping_zones/shipping_rates from the client -- it must resolve
// through the exact same resolveShipping the order write calls
// (lib/supabase/orders-api.ts), never a copy of its own. This suite pins
// that property directly against the real implementation, the same way
// tests/shipping/resolver.test.ts pins resolveShipping's own strategies.
const { getRuntimeStoreIdMock, getServiceEcommerceClientMock } = vi.hoisted(() => ({
  getRuntimeStoreIdMock: vi.fn(),
  getServiceEcommerceClientMock: vi.fn(),
}))

vi.mock("@/lib/utils/store", () => ({ getRuntimeStoreId: getRuntimeStoreIdMock }))
vi.mock("@/lib/supabase/service-client", () => ({ getServiceEcommerceClient: getServiceEcommerceClientMock }))

import { getCheckoutShippingQuote } from "@/app/checkout/actions"
import { resolveShipping } from "@/lib/shipping/resolver"
import { createShippingSupabase, type Row } from "@/tests/shipping/fake-supabase"

const STORE_ID = "store-1"
const MEDELLIN = { departmentCode: "05", municipalityCode: "05001" }

function ownRatesSettings(): Row {
  return { store_id: STORE_ID, mode: "own_rates", unmatched_destination_action: "block" }
}

function flatZoneSeed(amount: number): Record<string, Row[]> {
  return {
    shipping_zones: [{ id: "zone-1", store_id: STORE_ID, name: "Zona" }],
    shipping_zone_destinations: [
      { id: "dest-1", zone_id: "zone-1", store_id: STORE_ID, department_code: MEDELLIN.departmentCode, municipality_code: MEDELLIN.municipalityCode },
    ],
    shipping_rates: [{ id: "rate-1", zone_id: "zone-1", basis: "flat", range_from: null, range_to: null, amount }],
  }
}

describe("getCheckoutShippingQuote", () => {
  beforeEach(() => {
    getRuntimeStoreIdMock.mockReset()
    getServiceEcommerceClientMock.mockReset()
    getRuntimeStoreIdMock.mockResolvedValue(STORE_ID)
  })

  it("resolves through the same computation as resolveShipping", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      ...flatZoneSeed(6000),
    })
    getServiceEcommerceClientMock.mockReturnValue(supabase)

    const input = { destination: MEDELLIN, subtotal: 100000, items: [] }

    const [direct, quoted] = await Promise.all([
      resolveShipping(supabase as any, { storeId: STORE_ID, ...input }),
      getCheckoutShippingQuote(input),
    ])

    expect(quoted).toEqual({ ok: true, resolution: direct })
  })

  it("refuses when the service client is not configured", async () => {
    getServiceEcommerceClientMock.mockReturnValue(null)

    const result = await getCheckoutShippingQuote({ destination: MEDELLIN, subtotal: 100000, items: [] })

    expect(result).toEqual({ ok: false, blocked: false })
  })
})
