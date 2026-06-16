import { describe, expect, it } from "vitest"

import {
  buildAssistantCommerceContext,
  getAssistantCommerceContext,
  isCommerceContextQuestion,
  type AssistantCommerceCombo,
  type AssistantCommerceProduct,
} from "@/lib/chatbot/commerce-context"

const now = new Date("2026-05-14T12:00:00.000Z")
const product = (overrides: Partial<AssistantCommerceProduct> = {}): AssistantCommerceProduct => ({
  id: "prod-1", item_name: "Café Especial", item_description: "Café tostado colombiano",
  base_price: 32000, compare_at_price: 42000, currency_code: "COP", item_slug: "cafe-especial",
  is_active: true, is_available_for_sale: true, track_inventory: true, inventory_quantity: 8,
  metadata: { ai_details: "Molido medio" }, ...overrides,
})
const context = (input: Partial<Parameters<typeof buildAssistantCommerceContext>[0]>) =>
  buildAssistantCommerceContext({ products: [], combos: [], popup: null, now, ...input })

type AssistantCommerceClient = Parameters<typeof getAssistantCommerceContext>[0]["supabase"]
type ProductQueryResult = { data: AssistantCommerceProduct[] | null; error: unknown }

class FakeProductQuery implements PromiseLike<ProductQueryResult> {
  readonly searchFilters: string[] = []

  constructor(private readonly products: AssistantCommerceProduct[]) {}

  select() { return this }
  eq() { return this }
  order() { return this }
  limit() { return this }
  or(filters: string) { this.searchFilters.push(filters); return this }
  then<TResult1 = ProductQueryResult, TResult2 = never>(
    onfulfilled?: ((value: ProductQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const result = { data: this.searchFilters.length ? [] : this.products, error: null }
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }
}

class EmptyMetadataQuery {
  select() { return this }
  eq() { return this }
  async maybeSingle() { return { data: null, error: null } }
}

function fakeCommerceClient(products: AssistantCommerceProduct[]) {
  const productQuery = new FakeProductQuery(products)
  const client = {
    from: (table: string) => table === "store_items" ? productQuery : new EmptyMetadataQuery(),
  } as unknown as AssistantCommerceClient

  return { client, productQuery }
}

describe("assistant commerce context", () => {
  it("formats discounted products with real current/previous prices, stock, and CTA", () => {
    const output = context({ products: [product()] })
    expect(output).toContain("Café Especial")
    expect(output).toContain("Precio actual: 32000 COP")
    expect(output).toContain("Precio anterior: 42000 COP")
    expect(output).toContain("Disponibilidad: disponible (8 en inventario)")
    expect(output).toContain("CTA: /products/cafe-especial")
  })

  it("does not invent discount labels or CTAs for unavailable/no-discount products", () => {
    const output = context({ products: [product({ item_name: "Café Regular", base_price: 28000, compare_at_price: 28000, item_slug: "cafe-regular", is_available_for_sale: false, inventory_quantity: 0 })] })
    expect(output).toContain("Café Regular")
    expect(output).toContain("Precio actual: 28000 COP")
    expect(output).not.toContain("Precio anterior")
    expect(output).not.toContain("CTA: /products/cafe-regular")
    expect(output).toContain("Disponibilidad: no disponible")
  })

  it("does not text-filter away real discounts for generic promotion questions", async () => {
    const { client, productQuery } = fakeCommerceClient([
      product({ item_name: "Café Regular", base_price: 28000, compare_at_price: 28000 }),
      product({ item_name: "Café Especial", base_price: 32000, compare_at_price: 42000 }),
    ])

    const output = await getAssistantCommerceContext({
      supabase: client,
      storeUuid: "store-1",
      userMessage: "¿Qué descuentos o cupones tienen hoy?",
      now,
    })

    expect(productQuery.searchFilters).toEqual([])
    expect(output).toContain("Precio anterior: 42000 COP")
    expect(output.indexOf("Café Especial")).toBeLessThan(output.indexOf("Café Regular"))
  })

  it("includes only available combos", () => {
    const combo = (name: string, isAvailable: boolean): AssistantCommerceCombo => ({
      id: name, name, slug: name.toLowerCase().replace(/ /g, "-"), description: "Café + filtro", isActive: true,
      pricing: { finalUnitPrice: 50000, componentSubtotal: 62000, currencyCode: "COP" }, availability: { isAvailable },
    })
    const output = context({ combos: [combo("Combo Cafetero", true), combo("Combo Agotado", false)] })
    expect(output).toContain("Combo: Combo Cafetero")
    expect(output).toContain("Precio anterior: 62000 COP")
    expect(output).toContain("CTA: /products/combo-cafetero")
    expect(output).not.toContain("Combo Agotado")
  })

  it("includes only active current public popup/coupon context", () => {
    const popup = { active: true, title: "Bienvenida", text: "Ahorra", ctaText: "Copiar cupón", ctaUrl: null, coupon: "HOLA10", ctaMode: "copy_coupon" as const, startsAt: "2026-05-01T00:00:00.000Z", endsAt: "2026-05-31T23:59:59.000Z", imageUrl: null, delaySeconds: 3, frequencyHours: 24, visibleDurationSeconds: 15, fingerprint: "abc" }
    expect(context({ popup })).toContain("Cupón: HOLA10")
    expect(context({ popup: { ...popup, title: "Expirada", coupon: "OLD10", endsAt: "2026-05-01T00:00:00.000Z" } })).toBe("")
  })

  it("detects discount, coupon, combo, product-name, and greeting intents", () => {
    expect(isCommerceContextQuestion("¿Tienen descuentos o cupones?")).toBe(true)
    expect(isCommerceContextQuestion("Quiero comprar el combo cafetero")).toBe(true)
    expect(isCommerceContextQuestion("Café Especial")).toBe(true)
    expect(isCommerceContextQuestion("Hola")).toBe(false)
  })
})
