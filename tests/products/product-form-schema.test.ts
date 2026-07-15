import { describe, expect, it } from "vitest"

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
}

function firstMessage(result: ReturnType<typeof productSchema.safeParse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("product form schema", () => {
  it("accepts a fully valid payload", () => {
    expect(productSchema.safeParse(validInput).success).toBe(true)
  })

  it("requires a product name", () => {
    const result = productSchema.safeParse({ ...validInput, item_name: "  " })
    expect(firstMessage(result)).toBe("El nombre del producto es requerido")
  })

  it("rejects a base price that is not greater than zero", () => {
    for (const base_price of ["0", "", "-5"]) {
      const result = productSchema.safeParse({ ...validInput, base_price })
      expect(firstMessage(result)).toBe("El precio base debe ser mayor a 0")
    }
  })

  it("allows empty stock, because it is only asked for when inventory is tracked", () => {
    expect(productSchema.safeParse({ ...validInput, inventory_quantity: "" }).success).toBe(true)
  })

  it("rejects a negative stock quantity", () => {
    const result = productSchema.safeParse({ ...validInput, inventory_quantity: "-5" })
    expect(firstMessage(result)).toBe("La cantidad de stock no puede ser negativa")
  })

  it("accepts a valid non-negative stock quantity", () => {
    expect(productSchema.safeParse({ ...validInput, inventory_quantity: "5" }).success).toBe(true)
  })

  it("rejects more than five images", () => {
    const images = Array.from({ length: 6 }, (_, index) => `https://cdn/${index}.webp`)
    expect(firstMessage(productSchema.safeParse({ ...validInput, images }))).toBe(
      "Solo se permiten máximo 5 imágenes",
    )
  })

  it("does not block on an invalid compare-at price (handled by pricing helpers)", () => {
    const result = productSchema.safeParse({
      ...validInput,
      compare_at_price: "1",
    })
    expect(result.success).toBe(true)
  })
})
