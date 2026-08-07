import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

import * as shippingStatusLabel from "@/lib/shipping/status-label"
import { shippingStatusLabelKeyForBuyer, shippingStatusLabelKeyForStore } from "@/lib/shipping/status-label"
import { translations } from "@/lib/i18n/translations"

const buyerLabels = translations.es.orders.shippingStatusLabels.buyer
const storeLabels = translations.es.orders.shippingStatusLabels.store

// D23/A15: wave 4 shipped this as two files (S10's checkout-quote formatter,
// S11's order/admin mapping) that quietly disagreed on what "out_of_zone"
// renders as. This suite pins the merged, audience-scoped replacement so
// that bug can't come back.
describe("shipping status label: audience-scoped mapping (A15)", () => {
  it("buyer collapses agreed and out_of_zone onto the same key", () => {
    expect(shippingStatusLabelKeyForBuyer("agreed")).toBe("agreed")
    expect(shippingStatusLabelKeyForBuyer("out_of_zone")).toBe("agreed")
  })

  it("store keeps agreed and out_of_zone apart", () => {
    expect(shippingStatusLabelKeyForStore("agreed")).toBe("agreed")
    expect(shippingStatusLabelKeyForStore("out_of_zone")).toBe("outOfZone")
  })

  it("rate and a legacy null status render no phrase, on either audience -- the caller formats the amount instead", () => {
    for (const status of ["rate", null, undefined] as const) {
      expect(shippingStatusLabelKeyForBuyer(status)).toBeNull()
      expect(shippingStatusLabelKeyForStore(status)).toBeNull()
    }
  })

  it("out_of_zone renders DIFFERENTLY for a buyer-facing surface than for a store-facing one", () => {
    const buyerKey = shippingStatusLabelKeyForBuyer("out_of_zone")
    const storeKey = shippingStatusLabelKeyForStore("out_of_zone")
    if (!buyerKey || !storeKey) throw new Error("out_of_zone must resolve to a key on both audiences")

    expect(buyerLabels[buyerKey]).not.toBe(storeLabels[storeKey])
  })

  it("agreed renders CONSISTENTLY across both audiences -- it's the store's own policy, not a coverage gap", () => {
    const buyerKey = shippingStatusLabelKeyForBuyer("agreed")
    const storeKey = shippingStatusLabelKeyForStore("agreed")
    if (!buyerKey || !storeKey) throw new Error("agreed must resolve to a key on both audiences")

    expect(buyerLabels[buyerKey]).toBe(storeLabels[storeKey])
  })

  it("free renders CONSISTENTLY across both audiences", () => {
    const buyerKey = shippingStatusLabelKeyForBuyer("free")
    const storeKey = shippingStatusLabelKeyForStore("free")
    if (!buyerKey || !storeKey) throw new Error("free must resolve to a key on both audiences")

    expect(buyerLabels[buyerKey]).toBe(storeLabels[storeKey])
  })
})

describe("shipping status label: exactly one exported mapping", () => {
  it("exports only the two audience-scoped functions -- no third, unaudienced mapping", () => {
    expect(Object.keys(shippingStatusLabel).sort()).toEqual(
      ["shippingStatusLabelKeyForBuyer", "shippingStatusLabelKeyForStore"].sort(),
    )
  })

  it("the wave-4 duplicate (lib/shipping/status-display.ts) stays dead", () => {
    expect(existsSync("lib/shipping/status-display.ts")).toBe(false)
    expect(existsSync("lib/shipping/status-label.ts")).toBe(true)
  })
})
