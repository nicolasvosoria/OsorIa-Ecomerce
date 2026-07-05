import { describe, expect, it } from "vitest"
import {
  getAdminCompareAtPriceNotice,
  getValidCompareAtPrice,
  resolveCommercePrice,
} from "@/lib/products/pricing"

describe("product pricing visibility", () => {
  it("formats valid comparison prices with savings and discount labels", () => {
    const pricing = resolveCommercePrice({ amount: 72000, compareAtAmount: 90000, currencyCode: "COP" })

    expect(pricing.label).toBe("$ 72.000")
    expect(pricing.compareAtLabel).toBe("$ 90.000")
    expect(pricing.savingsLabel).toBe("Ahorra $ 18.000 (20%)")
    expect(pricing.hasDiscount).toBe(true)
  })

  it("omits false discounts when comparison is not greater than current price", () => {
    const pricing = resolveCommercePrice({ amount: 72000, compareAtAmount: 70000, currencyCode: "COP" })

    expect(pricing.compareAtLabel).toBeUndefined()
    expect(pricing.savingsLabel).toBeUndefined()
    expect(pricing.hasDiscount).toBe(false)
    expect(pricing.hasInvalidComparison).toBe(true)
    expect(getValidCompareAtPrice(72000, 70000)).toBeUndefined()
    expect(getAdminCompareAtPriceNotice(72000, 70000)).toMatch(/precio anterior debe ser mayor/i)
  })
})
