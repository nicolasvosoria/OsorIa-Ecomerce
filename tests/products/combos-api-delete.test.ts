import { describe, expect, it } from "vitest"

import { deleteCombo } from "@/lib/supabase/combos-api"

type ScriptedResponse = { data?: unknown; error?: unknown }

function createDeleteComboSupabase(script: ScriptedResponse) {
  const filters: Array<{ column: string; value: unknown }> = []
  const builder: any = {
    delete: () => builder,
    eq: (column: string, value: unknown) => {
      filters.push({ column, value })
      return builder
    },
    select: () => builder,
    single: () => Promise.resolve(script),
  }

  return { supabase: { from: () => builder }, filters }
}

describe("deleteCombo store scoping", () => {
  it("hard-deletes a combo scoped to the requesting store", async () => {
    const { supabase, filters } = createDeleteComboSupabase({ data: { id: "combo-1" }, error: null })

    const result = await deleteCombo("combo-1", "store-1", supabase)

    expect(result).toEqual({ success: true })
    expect(filters).toEqual(
      expect.arrayContaining([
        { column: "id", value: "combo-1" },
        { column: "store_id", value: "store-1" },
      ]),
    )
  })

  it("refuses to delete a combo that does not belong to the given store", async () => {
    const { supabase } = createDeleteComboSupabase({
      data: null,
      error: { message: "No rows found" },
    })

    const result = await deleteCombo("combo-1", "another-store", supabase)

    expect(result).toEqual({ success: false, error: "No rows found" })
  })

  it("reports a not-found error when the delete matches nothing but supabase returns no error", async () => {
    const { supabase } = createDeleteComboSupabase({ data: null, error: null })

    const result = await deleteCombo("missing-combo", "store-1", supabase)

    expect(result).toEqual({ success: false, error: "Combo no encontrado" })
  })
})
