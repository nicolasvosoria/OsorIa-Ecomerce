import { describe, expect, it } from "vitest"

import { resolveWeightGrams } from "@/lib/products/adapter"
import { productSchema } from "@/lib/products/schemas"

const validInput = {
  item_name: "Café Especial",
  item_code: "",
  item_description: "",
  ai_details: "",
  category_id: "",
  base_price: "12000",
  compare_at_price: "",
  currency_code: "COP",
  is_active: true,
  is_featured: false,
  is_available_for_sale: true,
  track_inventory: false,
  low_stock_threshold: "10",
  seo_title: "",
  seo_description: "",
  tags: "",
  display_order: "0",
  images: [] as string[],
  inventory_quantity: "5",
  weight_grams: "500",
}

function firstMessage(result: ReturnType<typeof productSchema.safeParse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("product weight is required on create, for every store and mode (D9)", () => {
  it("accepts a payload that carries a weight", () => {
    expect(productSchema.safeParse(validInput).success).toBe(true)
  })

  it("rejects creating a product with no weight", () => {
    const result = productSchema.safeParse({ ...validInput, weight_grams: "" })
    expect(result.success).toBe(false)
    expect(firstMessage(result)).toBe("El peso es requerido")
  })

  it("accepts a weight of exactly zero, matching the column's non-negativity constraint", () => {
    expect(productSchema.safeParse({ ...validInput, weight_grams: "0" }).success).toBe(true)
  })

  it("rejects a negative weight", () => {
    const result = productSchema.safeParse({ ...validInput, weight_grams: "-5" })
    expect(result.success).toBe(false)
    expect(firstMessage(result)).toBe("El peso es requerido")
  })
})

describe("resolveWeightGrams mirrors how a variant's price overrides base_price (D22)", () => {
  it("uses the variant's own weight when it carries one", () => {
    expect(
      resolveWeightGrams({ weight_grams: 500 }, { weight_grams: 750 }),
    ).toBe(750)
  })

  it("falls back to the product's base weight when the variant has none", () => {
    expect(
      resolveWeightGrams({ weight_grams: 500 }, { weight_grams: null }),
    ).toBe(500)
  })

  it("falls back to the product's base weight when there is no variant at all", () => {
    expect(resolveWeightGrams({ weight_grams: 500 })).toBe(500)
  })

  it("resolves to null when neither the variant nor the base product has a weight (D22's 'missing weight')", () => {
    expect(resolveWeightGrams({ weight_grams: null }, { weight_grams: null })).toBeNull()
  })
})
