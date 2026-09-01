import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260807000900_ecommerce_untracked_inventory_stays_put.sql",
)

describe("ecommerce.decrement_inventory", () => {
  const sql = readFileSync(MIGRATION, "utf8")

  it("deja quieto el contador de las variantes sin seguimiento", () => {
    expect(sql).toContain("update ecommerce.item_variants")
    expect(sql).toMatch(
      /update ecommerce\.item_variants\s+set inventory_quantity = case\s+when track_inventory then inventory_quantity - v_quantity\s+else inventory_quantity\s+end/,
    )
  })

  it("deja quieto el contador de los productos sin seguimiento", () => {
    expect(sql).toMatch(
      /update ecommerce\.store_items\s+set inventory_quantity = case\s+when track_inventory then inventory_quantity - v_quantity\s+else inventory_quantity\s+end/,
    )
  })

  it("no vuelve a restar incondicionalmente en ninguna de las dos ramas", () => {
    expect(sql).not.toMatch(/set inventory_quantity = inventory_quantity - v_quantity/)
  })

  it("conserva el WHERE que nunca bloquea una venta sin seguimiento", () => {
    const guards = sql.match(/track_inventory = false or inventory_quantity >= v_quantity/g)
    expect(guards).toHaveLength(2)
  })
})
