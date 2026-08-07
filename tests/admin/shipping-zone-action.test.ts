import { beforeEach, describe, expect, it, vi } from "vitest"

// saveShippingZoneAction must validate the NARROWED ladder shape
// toRateLadderPayload actually produces -- {basis:"flat", amount} OR
// {basis, ranges} -- not shippingZoneFormSchema's looseRateLadderFieldSchema
// (basis + amount + ranges all required together), which rejects every real
// save with a generic INVALID_INPUT and makes the whole zones feature
// unusable. tests/admin/shipping-zone-editor.test.tsx mocks this action, so
// it can't catch that class of bug. This suite drives the REAL action --
// only authorizeActiveStoreAdmin and revalidatePath are mocked, the same
// infra-only mocking shape tests/checkout/checkout-shipping-quote-action.test.ts
// already uses -- against a fake supabase, building the exact wire payload
// zone-editor.tsx's onSubmit constructs for each basis.
const { authorizeActiveStoreAdmin, revalidatePath } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { saveShippingZoneAction } from "@/app/admin/settings/shipping/actions"
import {
  shippingRateLadderSchema,
  toRateLadderPayload,
  type ShippingRateLadderFormValues,
  type ShippingZoneDestinationInput,
} from "@/lib/shipping/schemas"
import { createShippingSupabase } from "@/tests/shipping/fake-supabase"

const ANTIOQUIA_MEDELLIN = {
  department_code: "05",
  department_name: "ANTIOQUIA",
  municipality_code: "05001",
  municipality_name: "MEDELLÍN",
}

const STORE_ID = "store-1"
const DESTINATIONS: ShippingZoneDestinationInput[] = [{ departmentCode: "05", municipalityCode: "05001" }]

// Mirrors zone-editor.tsx's onSubmit exactly: RHF's loose form state (basis,
// amount AND ranges all present regardless of the chosen basis) narrowed
// through toRateLadderPayload + the strict shippingRateLadderSchema -- never
// the raw form shape, and never the form's untrimmed name (Finding 3).
function editorPayload(formLadder: ShippingRateLadderFormValues) {
  const parsedLadder = shippingRateLadderSchema.parse(toRateLadderPayload(formLadder))
  return { name: "  Zona Norte  ", destinations: DESTINATIONS, rateLadder: parsedLadder }
}

function grant(supabase: unknown) {
  return { supabase, storeId: STORE_ID, userId: "user-1" }
}

describe("saveShippingZoneAction (client -> server wire boundary)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("saves a flat-basis zone with the exact payload the editor sends, trimming the name", async () => {
    const { supabase, tables } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })
    authorizeActiveStoreAdmin.mockResolvedValue(grant(supabase))

    const result = await saveShippingZoneAction(
      editorPayload({ basis: "flat", amount: "5000", ranges: [{ from: "0", to: "", amount: "" }] }),
    )

    expect(result).toEqual({ success: true })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/shipping")
    expect(tables.get("shipping_zones")?.[0]).toMatchObject({ name: "Zona Norte" })
  })

  it("saves an order_value-basis zone with the exact payload the editor sends", async () => {
    const { supabase } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })
    authorizeActiveStoreAdmin.mockResolvedValue(grant(supabase))

    const result = await saveShippingZoneAction(
      editorPayload({
        basis: "order_value",
        amount: "0",
        ranges: [
          { from: "0", to: "50000", amount: "5000" },
          { from: "50000", to: "", amount: "0" },
        ],
      }),
    )

    expect(result).toEqual({ success: true })
  })

  it("saves a weight-basis zone with the exact payload the editor sends", async () => {
    const { supabase } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })
    authorizeActiveStoreAdmin.mockResolvedValue(grant(supabase))

    const result = await saveShippingZoneAction(
      editorPayload({ basis: "weight", amount: "0", ranges: [{ from: "0", to: "", amount: "5000" }] }),
    )

    expect(result).toEqual({ success: true })
  })
})
