import { describe, expect, it } from "vitest"

import { createProductSchema, editProductSchema } from "@/lib/products/schemas"

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
}

function firstMessage(result: ReturnType<typeof createProductSchema.safeParse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("product form schemas", () => {
  it("accepts a fully valid create payload", () => {
    expect(createProductSchema.safeParse(validInput).success).toBe(true)
  })

  it("requires a product name", () => {
    const result = createProductSchema.safeParse({ ...validInput, item_name: "  " })
    expect(firstMessage(result)).toBe("El nombre del producto es requerido")
  })

  it("rejects a base price that is not greater than zero", () => {
    for (const base_price of ["0", "", "-5"]) {
      const result = createProductSchema.safeParse({ ...validInput, base_price })
      expect(firstMessage(result)).toBe("El precio base debe ser mayor a 0")
    }
  })

  it("requires stock on create and rejects negative stock", () => {
    expect(firstMessage(createProductSchema.safeParse({ ...validInput, inventory_quantity: "" }))).toBe(
      "La cantidad en stock es requerida",
    )
    expect(firstMessage(createProductSchema.safeParse({ ...validInput, inventory_quantity: "-1" }))).toBe(
      "La cantidad de stock no puede ser negativa",
    )
  })

  it("rejects more than five images", () => {
    const images = Array.from({ length: 6 }, (_, index) => `https://cdn/${index}.webp`)
    expect(firstMessage(createProductSchema.safeParse({ ...validInput, images }))).toBe(
      "Solo se permiten máximo 5 imágenes",
    )
  })

  it("does not block on an invalid compare-at price (handled by pricing helpers)", () => {
    const result = createProductSchema.safeParse({ ...validInput, compare_at_price: "1" })
    expect(result.success).toBe(true)
  })

  it("allows empty stock on edit, mirroring the previous edit form", () => {
    expect(editProductSchema.safeParse({ ...validInput, inventory_quantity: "" }).success).toBe(true)
  })
})
