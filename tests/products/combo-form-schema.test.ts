import { describe, expect, it } from "vitest"

import { comboSchema } from "@/lib/combos/schemas"

const validInput = {
  name: "Combo Café",
  slug: "",
  category_id: "",
  description: "",
  image_url: "",
  seo_title: "",
  seo_description: "",
  is_active: true,
  discount_type: "percentage" as const,
  discount_value: "10",
  components: [
    { product_id: "coffee", variant_id: "", quantity: "1" },
    { product_id: "mug", variant_id: "", quantity: "1" },
  ],
}

function firstMessage(result: ReturnType<typeof comboSchema.safeParse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("combo form schema", () => {
  it("accepts a valid combo with two distinct components", () => {
    expect(comboSchema.safeParse(validInput).success).toBe(true)
  })

  it("requires a combo name", () => {
    const result = comboSchema.safeParse({ ...validInput, name: "  " })
    expect(firstMessage(result)).toBe("El nombre del combo es requerido")
  })

  it("rejects fewer than two distinct components", () => {
    const result = comboSchema.safeParse({
      ...validInput,
      components: [{ product_id: "coffee", variant_id: "", quantity: "1" }],
    })
    expect(firstMessage(result)).toBe("Selecciona al menos dos productos o variantes diferentes")
  })

  it("rejects two rows for the same product and variant as not distinct", () => {
    const result = comboSchema.safeParse({
      ...validInput,
      components: [
        { product_id: "coffee", variant_id: "", quantity: "1" },
        { product_id: "coffee", variant_id: "", quantity: "2" },
      ],
    })
    expect(firstMessage(result)).toBe("Selecciona al menos dos productos o variantes diferentes")
  })

  it("treats the same product with different variants as distinct", () => {
    const result = comboSchema.safeParse({
      ...validInput,
      components: [
        { product_id: "coffee", variant_id: "250g", quantity: "1" },
        { product_id: "coffee", variant_id: "500g", quantity: "1" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("ignores draft rows with no product selected when counting distinct components", () => {
    const result = comboSchema.safeParse({
      ...validInput,
      components: [
        { product_id: "coffee", variant_id: "", quantity: "1" },
        { product_id: "mug", variant_id: "", quantity: "1" },
        { product_id: "", variant_id: "", quantity: "1" },
      ],
    })
    expect(result.success).toBe(true)
  })
})
