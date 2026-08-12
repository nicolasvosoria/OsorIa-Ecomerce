import { describe, expect, it } from "vitest"

import { resolveShipping, type ShippingResolutionItem } from "@/lib/shipping/resolver"
import { createShippingSupabase, type Row } from "./fake-supabase"

const STORE_ID = "store-1"
const MEDELLIN = { departmentCode: "05", municipalityCode: "05001" }

function coordinateSettings(): Row {
  return { store_id: STORE_ID, mode: "coordinate", unmatched_destination_action: "block" }
}

function ownRatesSettings(unmatchedDestinationAction: "block" | "allow_with_coordination" = "block"): Row {
  return { store_id: STORE_ID, mode: "own_rates", unmatched_destination_action: unmatchedDestinationAction }
}

function flatZoneSeed(amount: number, municipalityCode: string | null = MEDELLIN.municipalityCode): Record<string, Row[]> {
  return {
    shipping_zones: [{ id: "zone-1", store_id: STORE_ID, name: "Zona" }],
    shipping_zone_destinations: [
      { id: "dest-1", zone_id: "zone-1", store_id: STORE_ID, department_code: MEDELLIN.departmentCode, municipality_code: municipalityCode },
    ],
    shipping_rates: [{ id: "rate-1", zone_id: "zone-1", basis: "flat", range_from: null, range_to: null, amount }],
  }
}

function item(overrides: Partial<ShippingResolutionItem> = {}): ShippingResolutionItem {
  return { productId: "product-1", variantId: null, comboId: null, productName: "Producto", quantity: 1, ...overrides }
}

describe("resolveShipping", () => {
  it("resolves coordinate mode to agreed/0 without a settings row (D11/D17 born default)", async () => {
    const { supabase } = createShippingSupabase({})

    const result = await resolveShipping(supabase as any, {
      storeId: STORE_ID,
      destination: MEDELLIN,
      subtotal: 100000,
      items: [],
    })

    expect(result).toEqual({ status: "agreed", amount: 0 })
  })

  it("resolves coordinate mode to agreed/0 even when the store explicitly saved it", async () => {
    const { supabase } = createShippingSupabase({ store_shipping_settings: [coordinateSettings()] })

    const result = await resolveShipping(supabase as any, {
      storeId: STORE_ID,
      destination: MEDELLIN,
      subtotal: 100000,
      items: [],
    })

    expect(result).toEqual({ status: "agreed", amount: 0 })
  })

  it("resolves a flat, positive own_rates zone to status rate", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      ...flatZoneSeed(8000),
    })

    const result = await resolveShipping(supabase as any, {
      storeId: STORE_ID,
      destination: MEDELLIN,
      subtotal: 100000,
      items: [],
    })

    expect(result).toEqual({ status: "rate", amount: 8000 })
  })

  // D6: free shipping is the ladder's own zero-amount rung, never a special case.
  it("resolves a flat, zero-amount own_rates zone to status free", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      ...flatZoneSeed(0),
    })

    const result = await resolveShipping(supabase as any, {
      storeId: STORE_ID,
      destination: MEDELLIN,
      subtotal: 100000,
      items: [],
    })

    expect(result).toEqual({ status: "free", amount: 0 })
  })

  // D3: a zone covering only Medellín (05/05001) must win over another zone
  // covering the whole department (05, municipality_code null) for the same
  // destination -- the municipality is more specific and always wins.
  it("prefers a municipality-level zone over a department-level zone for the same destination (D3)", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      shipping_zones: [
        { id: "zone-department", store_id: STORE_ID, name: "Antioquia completa" },
        { id: "zone-municipality", store_id: STORE_ID, name: "Medellín exprés" },
      ],
      shipping_zone_destinations: [
        { id: "dest-department", zone_id: "zone-department", store_id: STORE_ID, department_code: "05", municipality_code: null },
        { id: "dest-municipality", zone_id: "zone-municipality", store_id: STORE_ID, department_code: "05", municipality_code: "05001" },
      ],
      shipping_rates: [
        { id: "rate-department", zone_id: "zone-department", basis: "flat", range_from: null, range_to: null, amount: 3000 },
        { id: "rate-municipality", zone_id: "zone-municipality", basis: "flat", range_from: null, range_to: null, amount: 9000 },
      ],
    })

    const result = await resolveShipping(supabase as any, {
      storeId: STORE_ID,
      destination: MEDELLIN,
      subtotal: 100000,
      items: [],
    })

    expect(result).toEqual({ status: "rate", amount: 9000 })
  })

  // A destination NOT covered by the municipality zone but covered by the
  // department zone still resolves through the department -- the department
  // is the fallback, not ignored outright.
  it("falls back to a department-level zone when no municipality-level zone covers the destination", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      ...flatZoneSeed(4500, null),
    })

    const result = await resolveShipping(supabase as any, {
      storeId: STORE_ID,
      destination: MEDELLIN,
      subtotal: 100000,
      items: [],
    })

    expect(result).toEqual({ status: "rate", amount: 4500 })
  })

  describe("order_value basis", () => {
    function orderValueSeed(): Record<string, Row[]> {
      return {
        store_shipping_settings: [ownRatesSettings()],
        shipping_zones: [{ id: "zone-1", store_id: STORE_ID, name: "Zona" }],
        shipping_zone_destinations: [
          { id: "dest-1", zone_id: "zone-1", store_id: STORE_ID, department_code: MEDELLIN.departmentCode, municipality_code: MEDELLIN.municipalityCode },
        ],
        shipping_rates: [
          { id: "rate-low", zone_id: "zone-1", basis: "order_value", range_from: 0, range_to: 50000, amount: 5000 },
          { id: "rate-high", zone_id: "zone-1", basis: "order_value", range_from: 50000, range_to: null, amount: 0 },
        ],
      }
    }

    it("charges the lower rung just below its upper bound", async () => {
      const { supabase } = createShippingSupabase(orderValueSeed())

      const result = await resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 49999,
        items: [],
      })

      expect(result).toEqual({ status: "rate", amount: 5000 })
    })

    // Half-open ranges: a subtotal exactly ON the shared boundary belongs to
    // the range that STARTS there (the free top rung), not the one that ends
    // there -- the boundary is never double-counted or left uncovered.
    it("charges the upper rung exactly AT the shared boundary", async () => {
      const { supabase } = createShippingSupabase(orderValueSeed())

      const result = await resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 50000,
        items: [],
      })

      expect(result).toEqual({ status: "free", amount: 0 })
    })
  })

  describe("weight basis", () => {
    function weightSeed(): Record<string, Row[]> {
      return {
        store_shipping_settings: [ownRatesSettings()],
        shipping_zones: [{ id: "zone-1", store_id: STORE_ID, name: "Zona" }],
        shipping_zone_destinations: [
          { id: "dest-1", zone_id: "zone-1", store_id: STORE_ID, department_code: MEDELLIN.departmentCode, municipality_code: MEDELLIN.municipalityCode },
        ],
        shipping_rates: [
          { id: "rate-light", zone_id: "zone-1", basis: "weight", range_from: 0, range_to: 1000, amount: 4000 },
          { id: "rate-heavy", zone_id: "zone-1", basis: "weight", range_from: 1000, range_to: null, amount: 8000 },
        ],
      }
    }

    it("sums quantity x weight_grams across items, using the base weight when no variant overrides it", async () => {
      const { supabase } = createShippingSupabase({
        ...weightSeed(),
        store_items: [{ id: "product-1", weight_grams: 300 }],
      })

      const result = await resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [item({ quantity: 2 })],
      })

      // 300g x 2 = 600g, still under the 1000g boundary.
      expect(result).toEqual({ status: "rate", amount: 4000 })
    })

    it("charges the heavier rung exactly AT the weight boundary", async () => {
      const { supabase } = createShippingSupabase({
        ...weightSeed(),
        store_items: [{ id: "product-1", weight_grams: 500 }],
      })

      const result = await resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [item({ quantity: 2 })],
      })

      // 500g x 2 = 1000g, exactly on the boundary -- belongs to the rung that starts there.
      expect(result).toEqual({ status: "rate", amount: 8000 })
    })

    it("uses the variant's weight override instead of the product's base weight", async () => {
      const { supabase } = createShippingSupabase({
        ...weightSeed(),
        store_items: [{ id: "product-1", weight_grams: 100 }],
        item_variants: [{ id: "variant-1", item_id: "product-1", weight_grams: 900 }],
      })

      const result = await resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [item({ variantId: "variant-1", quantity: 1 })],
      })

      // The variant's 900g overrides the product's 100g base, still under 1000g.
      expect(result).toEqual({ status: "rate", amount: 4000 })
    })

    // D8/D22: an order can contain a product whose weight went null after S7
    // blocked activation -- this must fail loudly, never silently under-cost
    // the box.
    it("throws, naming the product, when an item's weight cannot be resolved", async () => {
      const { supabase } = createShippingSupabase({
        ...weightSeed(),
        store_items: [{ id: "product-1", weight_grams: null }],
      })

      await expect(
        resolveShipping(supabase as any, {
          storeId: STORE_ID,
          destination: MEDELLIN,
          subtotal: 100000,
          items: [item({ productName: "Silla de oficina" })],
        }),
      ).rejects.toThrow(/Silla de oficina/)
    })

    // A14: a combo item carries no product_id/variant_id of its own -- it
    // must weigh what its components weigh (sum of quantity x weight_grams
    // per component), scaled by how many of the combo the order carries.
    it("prices a combo item on a weight ladder from the sum of its components (A14)", async () => {
      const { supabase } = createShippingSupabase({
        ...weightSeed(),
        store_items: [
          { id: "component-a", weight_grams: 300 },
          { id: "component-b", weight_grams: 200 },
        ],
        product_combo_components: [
          { id: "pcc-1", combo_id: "combo-1", product_id: "component-a", variant_id: null, quantity: 2 },
          { id: "pcc-2", combo_id: "combo-1", product_id: "component-b", variant_id: null, quantity: 1 },
        ],
      })

      const result = await resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [
          item({ productId: null, variantId: null, comboId: "combo-1", productName: "Combo Desayuno", quantity: 2 }),
        ],
      })

      // One combo unit: (300g x 2) + (200g x 1) = 800g. Two combos ordered: 1600g, over the boundary.
      expect(result).toEqual({ status: "rate", amount: 8000 })
    })

    it("throws, naming the combo, when one of its components has no resolvable weight", async () => {
      const { supabase } = createShippingSupabase({
        ...weightSeed(),
        store_items: [{ id: "component-a", weight_grams: null }],
        product_combo_components: [
          { id: "pcc-1", combo_id: "combo-1", product_id: "component-a", variant_id: null, quantity: 1 },
        ],
      })

      await expect(
        resolveShipping(supabase as any, {
          storeId: STORE_ID,
          destination: MEDELLIN,
          subtotal: 100000,
          items: [item({ productId: null, variantId: null, comboId: "combo-1", productName: "Combo Desayuno" })],
        }),
      ).rejects.toThrow(/Combo Desayuno/)
    })
  })

  it("resolves to out_of_zone/0 when no zone covers the destination and the store allows it through", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings("allow_with_coordination")],
    })

    const result = await resolveShipping(supabase as any, {
      storeId: STORE_ID,
      destination: MEDELLIN,
      subtotal: 100000,
      items: [],
    })

    expect(result).toEqual({ status: "out_of_zone", amount: 0 })
  })

  // D7: the other half of the same setting -- when the store blocks instead
  // of allowing through, an unmatched destination must refuse the sale
  // outright rather than silently landing at 0.
  it("throws when no zone covers the destination and the store blocks unmatched destinations", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings("block")],
    })

    await expect(
      resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [],
      }),
    ).rejects.toThrow()
  })

  // D5/D6: S7 blocks SAVING an incomplete ladder, so this can only happen if
  // the data was corrupted after the fact -- the deliberate choice here is
  // to fail loudly rather than guess a price.
  it("throws when the matched zone has no rate rows at all", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      shipping_zones: [{ id: "zone-1", store_id: STORE_ID, name: "Zona" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-1", store_id: STORE_ID, department_code: MEDELLIN.departmentCode, municipality_code: MEDELLIN.municipalityCode },
      ],
      shipping_rates: [],
    })

    await expect(
      resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [],
      }),
    ).rejects.toThrow()
  })

  // Defect fix: an unrecognized basis (shipping_rates_basis_chk should make
  // this impossible, but the type system can't see that CHECK constraint)
  // must fail loudly instead of silently falling into the order_value branch
  // and pricing the shipment off the subtotal -- a wrong number the buyer
  // pays is strictly worse than an error.
  it("throws instead of pricing off the subtotal when a rate row carries an unrecognized basis", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      shipping_zones: [{ id: "zone-1", store_id: STORE_ID, name: "Zona" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-1", store_id: STORE_ID, department_code: MEDELLIN.departmentCode, municipality_code: MEDELLIN.municipalityCode },
      ],
      shipping_rates: [{ id: "rate-1", zone_id: "zone-1", basis: "per_item", range_from: null, range_to: null, amount: 5000 }],
    })

    await expect(
      resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [],
      }),
    ).rejects.toThrow(/basis/)
  })

  it("throws when the matched zone's ladder has a gap that leaves the order value uncovered", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [ownRatesSettings()],
      shipping_zones: [{ id: "zone-1", store_id: STORE_ID, name: "Zona" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-1", store_id: STORE_ID, department_code: MEDELLIN.departmentCode, municipality_code: MEDELLIN.municipalityCode },
      ],
      shipping_rates: [
        { id: "rate-low", zone_id: "zone-1", basis: "order_value", range_from: 0, range_to: 10000, amount: 3000 },
        { id: "rate-high", zone_id: "zone-1", basis: "order_value", range_from: 20000, range_to: null, amount: 0 },
      ],
    })

    await expect(
      resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 15000,
        items: [],
      }),
    ).rejects.toThrow()
  })

  // D19: the seam auto_quote will plug into later -- no store can be in this
  // mode today (the admin selector never offers it), so reaching it means
  // the model outran its only strategy. It must fail loudly, not guess.
  it("throws for auto_quote, which has no strategy behind it yet", async () => {
    const { supabase } = createShippingSupabase({
      store_shipping_settings: [{ store_id: STORE_ID, mode: "auto_quote", unmatched_destination_action: "block" }],
    })

    await expect(
      resolveShipping(supabase as any, {
        storeId: STORE_ID,
        destination: MEDELLIN,
        subtotal: 100000,
        items: [],
      }),
    ).rejects.toThrow(/auto_quote/)
  })
})
