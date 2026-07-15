import { describe, expect, it } from "vitest"

import { defaultProductFormValues, toProductFormValues } from "@/lib/products/form-values"
import { productSchema } from "@/lib/products/schemas"
import type { ItemImage, StoreItemWithDetails } from "@/lib/types/products"

function productWith(overrides: Partial<StoreItemWithDetails> = {}): StoreItemWithDetails {
  return {
    id: "item-1",
    item_name: "Café Especial",
    base_price: 12000,
    currency_code: "COP",
    is_active: true,
    is_featured: false,
    is_available_for_sale: true,
    track_inventory: false,
    inventory_quantity: 7,
    low_stock_threshold: 3,
    display_order: 2,
    view_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function galleryImage(imageUrl: string, displayOrder: number): ItemImage {
  return {
    id: `image-${displayOrder}`,
    image_url: imageUrl,
    display_order: displayOrder,
    image_type: "gallery",
    created_at: "2026-01-01T00:00:00Z",
  }
}

describe("defaultProductFormValues", () => {
  it("is a payload the form schema accepts once a name and a price are typed in", () => {
    const typed = {
      ...defaultProductFormValues,
      item_name: "Café",
      base_price: "1000",
    }
    expect(productSchema.safeParse(typed).success).toBe(true)
  })
})

describe("toProductFormValues image list", () => {
  it("puts the primary image first and keeps the gallery order behind it", () => {
    const product = productWith({
      primary_image_url: "https://cdn/primary.webp",
      images: [galleryImage("https://cdn/a.webp", 1), galleryImage("https://cdn/b.webp", 2)],
    })

    expect(toProductFormValues(product).images).toEqual([
      "https://cdn/primary.webp",
      "https://cdn/a.webp",
      "https://cdn/b.webp",
    ])
  })

  it("keeps the primary image only once when the gallery repeats it", () => {
    const product = productWith({
      primary_image_url: "https://cdn/primary.webp",
      images: [galleryImage("https://cdn/primary.webp", 1), galleryImage("https://cdn/a.webp", 2)],
    })

    expect(toProductFormValues(product).images).toEqual([
      "https://cdn/primary.webp",
      "https://cdn/a.webp",
    ])
  })

  it("drops duplicates inside the gallery itself", () => {
    const product = productWith({
      images: [galleryImage("https://cdn/a.webp", 1), galleryImage("https://cdn/a.webp", 2)],
    })

    expect(toProductFormValues(product).images).toEqual(["https://cdn/a.webp"])
  })

  it("starts from the gallery when the product has no primary image", () => {
    const product = productWith({
      images: [galleryImage("https://cdn/a.webp", 1)],
    })

    expect(toProductFormValues(product).images).toEqual(["https://cdn/a.webp"])
  })

  it("skips blank urls instead of offering an empty image slot", () => {
    const product = productWith({
      primary_image_url: "",
      images: [galleryImage("", 1), galleryImage("https://cdn/a.webp", 2)],
    })

    expect(toProductFormValues(product).images).toEqual(["https://cdn/a.webp"])
  })

  it("yields no images when the product has none", () => {
    expect(toProductFormValues(productWith()).images).toEqual([])
  })
})

describe("toProductFormValues ai details", () => {
  it("reads the assistant details out of the metadata bag", () => {
    const product = productWith({
      metadata: { ai_details: "Material: aluminio" },
    })

    expect(toProductFormValues(product).ai_details).toBe("Material: aluminio")
  })

  it("leaves the field empty when the product has no metadata", () => {
    expect(toProductFormValues(productWith()).ai_details).toBe("")
  })

  it("leaves the field empty when the metadata carries no assistant details", () => {
    const product = productWith({ metadata: { source: "import" } })

    expect(toProductFormValues(product).ai_details).toBe("")
  })

  it("ignores assistant details that are not text, so the textarea never gets an object", () => {
    const product = productWith({
      metadata: { ai_details: { note: "no soy texto" } },
    })

    expect(toProductFormValues(product).ai_details).toBe("")
  })
})

describe("toProductFormValues number coercion", () => {
  it("turns every numeric column into the string the inputs expect", () => {
    const product = productWith({
      base_price: 12000.5,
      compare_at_price: 15000,
      inventory_quantity: 7,
      low_stock_threshold: 3,
      display_order: 2,
    })

    expect(toProductFormValues(product)).toMatchObject({
      base_price: "12000.5",
      compare_at_price: "15000",
      inventory_quantity: "7",
      low_stock_threshold: "3",
      display_order: "2",
    })
  })

  it("keeps a zero as '0' instead of collapsing it to an empty field", () => {
    const product = productWith({
      compare_at_price: 0,
      inventory_quantity: 0,
      display_order: 0,
    })

    expect(toProductFormValues(product)).toMatchObject({
      compare_at_price: "0",
      inventory_quantity: "0",
      display_order: "0",
    })
  })

  it("empties the compare-at price when the product has none", () => {
    expect(toProductFormValues(productWith()).compare_at_price).toBe("")
  })
})

describe("toProductFormValues text fields", () => {
  it("maps the optional columns to empty strings, never to undefined", () => {
    expect(toProductFormValues(productWith())).toMatchObject({
      item_code: "",
      item_description: "",
      category_id: "",
      seo_title: "",
      seo_description: "",
      tags: "",
    })
  })

  it("joins the tags into the comma separated field", () => {
    const product = productWith({ tags: ["cafe", "premium"] })

    expect(toProductFormValues(product).tags).toBe("cafe, premium")
  })

  it("falls back to the default currency when the product has none", () => {
    const product = productWith({ currency_code: "" })

    expect(toProductFormValues(product).currency_code).toBe(defaultProductFormValues.currency_code)
  })

  it("produces a payload the form schema accepts", () => {
    const product = productWith({
      primary_image_url: "https://cdn/primary.webp",
    })

    expect(productSchema.safeParse(toProductFormValues(product)).success).toBe(true)
  })
})
