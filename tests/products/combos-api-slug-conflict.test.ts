import { beforeEach, describe, expect, it, vi } from "vitest"

import { getSupabaseEcommerce } from "@/lib/supabase/client"
import { createCombo, updateCombo } from "@/lib/supabase/combos-api"

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
}))

const SLUG_TAKEN_BY_PRODUCT_MESSAGE =
  "Ya existe un producto con este slug en la tienda. Elige otro para que el combo sea accesible."

const COMPONENT_PRODUCTS = [
  {
    id: "coffee-250g",
    store_id: "store-1",
    item_name: "Café 250g",
    base_price: 30000,
    is_active: true,
    is_available_for_sale: true,
  },
  {
    id: "mug",
    store_id: "store-1",
    item_name: "Mug",
    base_price: 20000,
    is_active: true,
    is_available_for_sale: true,
  },
]

type Write = { table: string; operation: string; payload?: unknown }

function createSlugLookupSupabase(slugLookup: { data?: unknown; error?: unknown }) {
  const writes: Write[] = []

  const supabase = {
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        limit: () => builder,
        order: () => builder,
        insert: (payload: unknown) => {
          writes.push({ table, operation: "insert", payload })
          return builder
        },
        update: (payload: unknown) => {
          writes.push({ table, operation: "update", payload })
          return builder
        },
        delete: () => {
          writes.push({ table, operation: "delete" })
          return builder
        },
        maybeSingle: () => Promise.resolve(slugLookup),
        single: () => Promise.resolve({ data: { id: "combo-1", store_id: "store-1" }, error: null }),
        then: (onfulfilled?: any, onrejected?: any) =>
          Promise.resolve({ data: table === "store_items" ? COMPONENT_PRODUCTS : [], error: null })
            .then(onfulfilled, onrejected),
      }

      return builder
    },
  }

  return { supabase, writes }
}

const comboInput = {
  store_id: "store-1",
  name: "Combo Café",
  slug: "combo-cafe",
  discount_type: "percentage" as const,
  discount_value: 10,
  components: [
    { product_id: "coffee-250g", quantity: 2 },
    { product_id: "mug", quantity: 1 },
  ],
}

// products-api resolves /products/[slug] against store_items first and only falls
// back to combos, so a combo saved with a product's slug would be unreachable in
// silence. No DB constraint can span both tables: the check has to be server-side.
describe("combo slug conflicts against the product namespace", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseEcommerce).mockReturnValue(null as any)
  })

  it("refuses to create a combo whose slug already belongs to a product of the same store", async () => {
    const { supabase, writes } = createSlugLookupSupabase({ data: { id: "product-1" }, error: null })

    const result = await createCombo(comboInput, supabase)

    expect(result).toEqual({ success: false, error: SLUG_TAKEN_BY_PRODUCT_MESSAGE })
    expect(writes).toEqual([])
  })

  it("creates the combo when no product owns the slug", async () => {
    const { supabase, writes } = createSlugLookupSupabase({ data: null, error: null })

    const result = await createCombo(comboInput, supabase)

    expect(result.success).toBe(true)
    expect(writes).toContainEqual(
      expect.objectContaining({
        table: "product_combos",
        operation: "insert",
        payload: expect.objectContaining({ slug: "combo-cafe", store_id: "store-1" }),
      }),
    )
  })

  it("refuses to update a combo onto a slug that a product already owns", async () => {
    const { supabase, writes } = createSlugLookupSupabase({ data: { id: "product-1" }, error: null })

    const result = await updateCombo("combo-1", { slug: "Combo Café" }, "store-1", supabase)

    expect(result).toEqual({ success: false, error: SLUG_TAKEN_BY_PRODUCT_MESSAGE })
    expect(writes).toEqual([])
  })

  it("refuses to save when the slug lookup itself fails instead of persisting an unreachable combo", async () => {
    const { supabase, writes } = createSlugLookupSupabase({
      data: null,
      error: { message: "canceling statement due to statement timeout" },
    })

    const result = await createCombo(comboInput, supabase)

    expect(result).toEqual({
      success: false,
      error: "canceling statement due to statement timeout",
    })
    expect(writes).toEqual([])
  })
})
