import { describe, expect, it } from "vitest"

import {
  deleteShippingZone,
  findClaimedDestinations,
  listShippingZones,
  saveShippingZone,
  type SaveShippingZoneInput,
} from "@/lib/supabase/shipping-zones-api"
import { createShippingSupabase } from "./fake-supabase"

const ANTIOQUIA_MEDELLIN = {
  department_code: "05",
  department_name: "ANTIOQUIA",
  municipality_code: "05001",
  municipality_name: "MEDELLÍN",
}

const STORE_ID = "store-1"

function orderValueLadder(): SaveShippingZoneInput["rateLadder"] {
  return {
    basis: "order_value",
    ranges: [
      { from: "0", to: "50000", amount: "5000" },
      { from: "50000", to: "", amount: "0" },
    ],
  }
}

describe("saveShippingZone + listShippingZones", () => {
  it("saves a zone with two rate ranges and reads it back", async () => {
    const { supabase } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const saveResult = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Eje Cafetero",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: orderValueLadder(),
    })

    expect(saveResult.success).toBe(true)

    const zones = await listShippingZones(supabase as any, STORE_ID)

    expect(zones).toHaveLength(1)
    expect(zones[0]).toMatchObject({
      name: "Eje Cafetero",
      destinations: [
        { departmentCode: "05", departmentName: "ANTIOQUIA", municipalityCode: "05001", municipalityName: "MEDELLÍN" },
      ],
    })
    expect(zones[0].rateLadder).toEqual({
      basis: "order_value",
      ranges: [
        { from: "0", to: "50000", amount: "5000" },
        { from: "50000", to: "", amount: "0" },
      ],
    })
  })

  it("rejects a municipality already assigned to another zone of the same store, naming the conflicting zone", async () => {
    const { supabase, tables } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      shipping_zones: [{ id: "zone-north", store_id: STORE_ID, name: "Zona Norte" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-north", store_id: STORE_ID, department_code: "05", municipality_code: "05001" },
      ],
    })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Sur",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: { basis: "flat", amount: "5000" },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toContain("Zona Norte")
    expect(tables.get("shipping_zones")).toHaveLength(1)
  })

  it("rejects a ladder that leaves a gap between ranges", async () => {
    const { supabase, tables } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Gap",
      destinations: [{ departmentCode: "05", municipalityCode: null }],
      rateLadder: {
        basis: "order_value",
        ranges: [
          { from: "0", to: "10000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ],
      },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toMatch(/vacío/)
    expect(tables.get("shipping_zones") ?? []).toHaveLength(0)
  })

  it("rejects a ladder whose ranges overlap, naming the overlap (not a generic error)", async () => {
    const { supabase, tables } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Overlap",
      destinations: [{ departmentCode: "05", municipalityCode: null }],
      rateLadder: {
        basis: "order_value",
        ranges: [
          { from: "0", to: "30000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ],
      },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toMatch(/superpon/)
    expect(tables.get("shipping_zones") ?? []).toHaveLength(0)
  })

  // Deliberate, isolated from scenario 1's fixture (which also happens to
  // touch at 50000 but never asserts it): pins the half-open boundary
  // semantics -- a shared endpoint is neither a gap nor an overlap -- as its
  // own case, so a fixture change elsewhere can't silently drop coverage of it.
  it("accepts a ladder whose ranges touch exactly at the boundary", async () => {
    const { supabase } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Frontera",
      destinations: [{ departmentCode: "05", municipalityCode: null }],
      rateLadder: {
        basis: "order_value",
        ranges: [
          { from: "0", to: "20000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ],
      },
    })

    expect(result.success).toBe(true)
  })

  it("rejects activating a weight-based rate while a product still lacks weight (D8)", async () => {
    const { supabase } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      store_items: [{ id: "item-1", store_id: STORE_ID, item_name: "Café Especial", weight_grams: null }],
    })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Peso",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: { basis: "weight", ranges: [{ from: "0", to: "", amount: "5000" }] },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toMatch(/peso/)
  })

  // A14: a combo has no weight of its own -- it weighs what its components
  // weigh -- so the D8 gate must also catch a combo whose component still
  // lacks one, not just a standalone product missing from the same list.
  it("rejects activating a weight-based rate while a combo's component still lacks weight (D8/A14)", async () => {
    const { supabase } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      store_items: [{ id: "component-1", store_id: STORE_ID, item_name: "Taza", weight_grams: null }],
      product_combos: [{ id: "combo-1", store_id: STORE_ID, name: "Combo Desayuno" }],
      product_combo_components: [
        { id: "pcc-1", combo_id: "combo-1", product_id: "component-1", variant_id: null, quantity: 1 },
      ],
    })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Peso",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: { basis: "weight", ranges: [{ from: "0", to: "", amount: "5000" }] },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toMatch(/peso/)
  })

  it("lets a municipality destination coexist with a different zone that covers its whole department (D3: municipio wins)", async () => {
    const { supabase } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      shipping_zones: [{ id: "zone-department", store_id: STORE_ID, name: "Antioquia completa" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-department", store_id: STORE_ID, department_code: "05", municipality_code: null },
      ],
    })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Medellín exprés",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: { basis: "flat", amount: "3000" },
    })

    expect(result.success).toBe(true)
  })
})

describe("deleteShippingZone", () => {
  it("only deletes a zone scoped to the authorized store", async () => {
    const { supabase, tables } = createShippingSupabase({
      shipping_zones: [
        { id: "zone-1", store_id: STORE_ID, name: "Zona 1" },
        { id: "zone-2", store_id: "other-store", name: "Zona 2" },
      ],
    })

    const otherStoreResult = await deleteShippingZone(supabase as any, STORE_ID, "zone-2")
    expect(otherStoreResult.success).toBe(false)
    expect(tables.get("shipping_zones")).toHaveLength(2)

    const ownStoreResult = await deleteShippingZone(supabase as any, STORE_ID, "zone-1")
    expect(ownStoreResult.success).toBe(true)
    expect(tables.get("shipping_zones")).toHaveLength(1)
  })
})

describe("findClaimedDestinations", () => {
  it("names the owning zone for each destination already claimed by another zone of the same store", async () => {
    const { supabase } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      shipping_zones: [
        { id: "zone-north", store_id: STORE_ID, name: "Zona Norte" },
        { id: "zone-south", store_id: STORE_ID, name: "Zona Sur" },
      ],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-north", store_id: STORE_ID, department_code: "05", municipality_code: null },
        { id: "dest-2", zone_id: "zone-south", store_id: STORE_ID, department_code: "76", municipality_code: "76001" },
      ],
    })

    const claimed = await findClaimedDestinations(supabase as any, STORE_ID)

    expect(claimed).toEqual([
      { departmentCode: "05", municipalityCode: null, zoneName: "Zona Norte" },
      { departmentCode: "76", municipalityCode: "76001", zoneName: "Zona Sur" },
    ])
  })

  it("excludes the given zone's own destinations from what it reports as claimed", async () => {
    const { supabase } = createShippingSupabase({
      shipping_zones: [{ id: "zone-north", store_id: STORE_ID, name: "Zona Norte" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-north", store_id: STORE_ID, department_code: "05", municipality_code: null },
      ],
    })

    const claimed = await findClaimedDestinations(supabase as any, STORE_ID, "zone-north")

    expect(claimed).toEqual([])
  })

  it("throws when the zone-name lookup fails, instead of labelling every destination as an unknown zone", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "shipping_zone_destinations") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ zone_id: "zone-north", department_code: "05", municipality_code: null }],
                  error: null,
                }),
            }),
          }
        }
        if (table === "shipping_zones") {
          return {
            select: () => ({
              in: () => Promise.resolve({ data: null, error: { message: "statement timeout" } }),
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }

    await expect(findClaimedDestinations(supabase as any, STORE_ID)).rejects.toThrow(
      "No se pudieron leer los nombres de las zonas",
    )
  })
})
