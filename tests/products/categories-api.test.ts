import { beforeEach, describe, expect, it, vi } from "vitest"

import { getSupabaseEcommerce } from "@/lib/supabase/client"
import {
  createCategory,
  deleteCategory,
  getCategoryBySlug,
  listCategoriesWithProductCounts,
  updateCategory,
} from "@/lib/supabase/categories-api"

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
}))

const NAME_TAKEN_MESSAGE = "Ya existe una categoría con este nombre en la tienda"
const SLUG_TAKEN_MESSAGE = "Ya existe una categoría con este slug en la tienda. Elige otro."

type Filter = { column: string; value: unknown }
type Write = { table: string; operation: string; payload?: unknown; filters: Filter[] }
type Read = { table: string; filters: Filter[] }

function createSupabase(options: {
  writeResult?: { data?: unknown; error?: unknown }
  selectRows?: Record<string, unknown[]>
} = {}) {
  const writes: Write[] = []
  const reads: Read[] = []
  const writeResult = options.writeResult ?? { data: { id: "cat-1" }, error: null }

  const supabase = {
    from(table: string) {
      const filters: Filter[] = []
      let pendingWrite: Write | null = null
      reads.push({ table, filters })

      const builder: any = {
        select: () => builder,
        order: () => builder,
        not: () => builder,
        eq: (column: string, value: unknown) => {
          filters.push({ column, value })
          return builder
        },
        insert: (payload: unknown) => {
          pendingWrite = { table, operation: "insert", payload, filters }
          writes.push(pendingWrite)
          return builder
        },
        update: (payload: unknown) => {
          pendingWrite = { table, operation: "update", payload, filters }
          writes.push(pendingWrite)
          return builder
        },
        delete: () => {
          pendingWrite = { table, operation: "delete", filters }
          writes.push(pendingWrite)
          return builder
        },
        maybeSingle: () =>
          Promise.resolve(pendingWrite ? writeResult : { data: (options.selectRows?.[table] ?? [])[0] ?? null, error: null }),
        single: () => Promise.resolve(writeResult),
        then: (onfulfilled?: any) =>
          Promise.resolve({ data: options.selectRows?.[table] ?? [], error: null }).then(onfulfilled),
      }

      return builder
    },
  }

  return { supabase, writes, reads }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSupabaseEcommerce).mockReturnValue(null as any)
})

describe("createCategory", () => {
  it("stores the slug so the public URL survives a later rename", async () => {
    const { supabase, writes } = createSupabase()

    await createCategory({ category_name: "Ropa Íntima" }, "store-1", supabase)

    expect(writes[0].payload).toMatchObject({ category_name: "Ropa Íntima", slug: "ropa-intima" })
  })

  it("normalizes an operator-typed slug instead of trusting it verbatim", async () => {
    const { supabase, writes } = createSupabase()

    await createCategory({ category_name: "Speakers", slug: "  Speakers Premium!! " }, "store-1", supabase)

    expect(writes[0].payload).toMatchObject({ slug: "speakers-premium" })
  })

  it("writes into the authorized store rather than any store on the payload", async () => {
    const { supabase, writes } = createSupabase()

    await createCategory({ category_name: "Speakers" }, "store-1", supabase)

    expect(writes[0].payload).toMatchObject({ store_id: "store-1" })
  })

  it("rejects a name that cannot form a slug instead of writing an unreachable category", async () => {
    const { supabase, writes } = createSupabase()

    const result = await createCategory({ category_name: "!!!" }, "store-1", supabase)

    expect(result).toMatchObject({ success: false })
    expect(result.error).toContain("slug")
    expect(writes).toHaveLength(0)
  })

  it("turns the raw 23505 on the name unique into a legible form error", async () => {
    const { supabase } = createSupabase({
      writeResult: {
        data: null,
        error: {
          code: "23505",
          message:
            'duplicate key value violates unique constraint "item_categories_store_id_category_name_key"',
        },
      },
    })

    const result = await createCategory({ category_name: "Speakers" }, "store-1", supabase)

    expect(result).toEqual({ success: false, error: NAME_TAKEN_MESSAGE })
  })

  it("distinguishes a duplicate slug from a duplicate name", async () => {
    const { supabase } = createSupabase({
      writeResult: {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint",
          details: 'Key (store_id, slug)=(store-1, speakers) already exists. item_categories_store_id_slug_key',
        },
      },
    })

    const result = await createCategory({ category_name: "Speakers II", slug: "speakers" }, "store-1", supabase)

    expect(result).toEqual({ success: false, error: SLUG_TAKEN_MESSAGE })
  })

  it("keeps the original cause for errors that are not uniqueness violations", async () => {
    const { supabase } = createSupabase({
      writeResult: { data: null, error: { code: "42501", message: "permission denied for table item_categories" } },
    })

    const result = await createCategory({ category_name: "Speakers" }, "store-1", supabase)

    expect(result.error).toBe("permission denied for table item_categories")
  })
})

describe("updateCategory", () => {
  it("scopes the write to the authorized store so another store's category cannot be edited", async () => {
    const { supabase, writes } = createSupabase()

    await updateCategory("cat-1", { category_name: "Speakers" }, "store-1", supabase)

    expect(writes[0].filters).toEqual(
      expect.arrayContaining([
        { column: "id", value: "cat-1" },
        { column: "store_id", value: "store-1" },
      ]),
    )
  })

  it("reports a category outside the store as not found instead of silently succeeding", async () => {
    const { supabase } = createSupabase({ writeResult: { data: null, error: null } })

    const result = await updateCategory("cat-other", { category_name: "Speakers" }, "store-1", supabase)

    expect(result).toEqual({ success: false, error: "Categoría no encontrada" })
  })
})

describe("deleteCategory", () => {
  it("scopes the delete to the authorized store", async () => {
    const { supabase, writes } = createSupabase()

    await deleteCategory("cat-1", "store-1", supabase)

    expect(writes[0].operation).toBe("delete")
    expect(writes[0].filters).toEqual(
      expect.arrayContaining([
        { column: "id", value: "cat-1" },
        { column: "store_id", value: "store-1" },
      ]),
    )
  })
})

describe("getCategoryBySlug", () => {
  // La categoría se renombró: su nombre ya no deriva su slug. Antes de persistirlo,
  // resolver por generateCategorySlug(category_name) daba "bocinas" y este 404eaba.
  it("queries the stored slug column, not a slug recomputed from the name", async () => {
    const stored = { id: "cat-1", category_name: "Bocinas", slug: "speakers" }
    const { supabase, reads } = createSupabase({ selectRows: { item_categories: [stored] } })

    const category = await getCategoryBySlug("speakers", "store-1", supabase)

    expect(category).toEqual(stored)
    expect(reads[0]).toMatchObject({ table: "item_categories" })
    expect(reads[0].filters).toEqual(
      expect.arrayContaining([
        { column: "slug", value: "speakers" },
        { column: "store_id", value: "store-1" },
        { column: "is_active", value: true },
      ]),
    )
  })

  it("serves an inactive category only when the caller asks for it", async () => {
    const { supabase, reads } = createSupabase({ selectRows: { item_categories: [] } })

    await getCategoryBySlug("speakers", "store-1", supabase, true)

    expect(reads[0].filters).not.toContainEqual({ column: "is_active", value: true })
  })
})

describe("listCategoriesWithProductCounts", () => {
  it("counts the products of each category and reports zero for the empty ones", async () => {
    const { supabase } = createSupabase({
      selectRows: {
        item_categories: [
          { id: "cat-1", category_name: "Speakers", slug: "speakers" },
          { id: "cat-2", category_name: "Stands", slug: "stands" },
        ],
        store_items: [{ category_id: "cat-1" }, { category_id: "cat-1" }],
      },
    })

    const categories = await listCategoriesWithProductCounts("store-1", supabase)

    expect(categories.map((category) => [category.id, category.productCount])).toEqual([
      ["cat-1", 2],
      ["cat-2", 0],
    ])
  })
})
