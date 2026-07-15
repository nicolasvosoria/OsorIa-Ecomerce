import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { generateCategorySlug } from "@/lib/utils/category-slug"

describe("generateCategorySlug", () => {
  it.each([
    ["Speakers", "speakers"],
    ["Ropa Íntima", "ropa-intima"],
    ["Café & Té", "cafe-te"],
    ["  --Niños--  ", "ninos"],
    ["Postres/Tortas", "postres-tortas"],
  ])("normalizes %j into %j", (name, expected) => {
    expect(generateCategorySlug(name)).toBe(expected)
  })

  it("yields an empty slug when a name has nothing sluggable, so writes can reject it", () => {
    expect(generateCategorySlug("!!!")).toBe("")
  })
})

// El backfill de 20260715000300 replicó esta función en SQL para que ninguna URL
// cambiara. Si alguien reordena o quita un paso aquí, los slugs ya almacenados
// dejan de coincidir con lo que el código genera y no hay nada que lo avise.
describe("the migration backfill mirrors generateCategorySlug", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260715000300_ecommerce_category_slug_seo.sql"),
    "utf8",
  )

  it.each([
    ["lowercases", "lower(category_name)"],
    ["decomposes accents", "normalize(lower(category_name), NFD)"],
    ["drops combining marks", "'[\\u0300-\\u036f]'"],
    ["turns non-alphanumerics into dashes", "'[^a-z0-9]+', '-', 'g'"],
    ["trims the edge dashes", "trim(both '-' from"],
  ])("%s", (_step, sql) => {
    expect(migration).toContain(sql)
  })
})
