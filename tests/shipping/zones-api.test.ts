import { describe, expect, it } from "vitest"

import { deleteShippingZone, listShippingZones, saveShippingZone, type SaveShippingZoneInput } from "@/lib/supabase/shipping-zones-api"

// Doble en memoria de supabase-js, con el mismo encadenado
// (.select/.eq/.neq/.in/.is/.order/.limit/.single/.maybeSingle) que
// lib/supabase/shipping-zones-api.ts usa contra insert/update/delete/select
// reales, para probar su lógica (guardar+leer, el rechazo de destino en
// conflicto, el rechazo de escalera con vacío) sin tocar Postgres. La prueba
// de contrato real contra la base viva es pnpm supabase:verify:shipping.
type Row = Record<string, unknown>

function createShippingSupabase(seed: Record<string, Row[]> = {}) {
  const tables = new Map<string, Row[]>(Object.entries(seed).map(([table, rows]) => [table, [...rows]]))
  let nextId = 1

  function table(name: string): Row[] {
    if (!tables.has(name)) tables.set(name, [])
    return tables.get(name)!
  }

  function from(name: string) {
    const rows = table(name)
    let operation: "select" | "insert" | "update" | "delete" = "select"
    let payload: Row | Row[] | null = null
    const filters: { type: "eq" | "neq" | "in" | "is"; column: string; value: unknown }[] = []
    let orderColumn: string | null = null
    let limitCount: number | null = null

    function matchesFilters(row: Row): boolean {
      return filters.every((filter) => {
        if (filter.type === "eq") return row[filter.column] === filter.value
        if (filter.type === "neq") return row[filter.column] !== filter.value
        if (filter.type === "in") return (filter.value as unknown[]).includes(row[filter.column])
        if (filter.type === "is") return row[filter.column] === filter.value
        return true
      })
    }

    function execute(): { data: unknown; error: null } {
      if (operation === "insert") {
        const inserted = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
          id: `${name}-${nextId++}`,
          ...(row as Row),
        }))
        rows.push(...inserted)
        return { data: inserted, error: null }
      }

      if (operation === "update") {
        const matched = rows.filter(matchesFilters)
        matched.forEach((row) => Object.assign(row, payload as Row))
        return { data: matched, error: null }
      }

      if (operation === "delete") {
        const matched = rows.filter(matchesFilters)
        const remaining = rows.filter((row) => !matched.includes(row))
        rows.length = 0
        rows.push(...remaining)
        return { data: matched, error: null }
      }

      let result = rows.filter(matchesFilters)
      if (orderColumn) {
        const column = orderColumn
        result = [...result].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1))
      }
      if (limitCount !== null) result = result.slice(0, limitCount)
      return { data: result, error: null }
    }

    const builder = {
      select: () => builder,
      order: (column: string) => {
        orderColumn = column
        return builder
      },
      limit: (count: number) => {
        limitCount = count
        return builder
      },
      eq: (column: string, value: unknown) => {
        filters.push({ type: "eq", column, value })
        return builder
      },
      neq: (column: string, value: unknown) => {
        filters.push({ type: "neq", column, value })
        return builder
      },
      in: (column: string, values: unknown[]) => {
        filters.push({ type: "in", column, value: values })
        return builder
      },
      is: (column: string, value: unknown) => {
        filters.push({ type: "is", column, value })
        return builder
      },
      insert: (rowsToInsert: Row | Row[]) => {
        operation = "insert"
        payload = rowsToInsert
        return builder
      },
      update: (patch: Row) => {
        operation = "update"
        payload = patch
        return builder
      },
      delete: () => {
        operation = "delete"
        return builder
      },
      single: () => {
        const { data } = execute()
        const row = Array.isArray(data) ? data[0] : data
        return Promise.resolve({ data: row ?? null, error: null })
      },
      maybeSingle: () => {
        const { data } = execute()
        const row = Array.isArray(data) ? (data[0] ?? null) : data
        return Promise.resolve({ data: row, error: null })
      },
      then: (onFulfilled: (result: { data: unknown; error: null }) => unknown) =>
        Promise.resolve(execute()).then(onFulfilled),
    }

    return builder
  }

  return { supabase: { from }, tables }
}

const ANTIOQUIA_MEDELLIN = {
  department_code: "05",
  department_name: "ANTIOQUIA",
  municipality_code: "05001",
  municipality_name: "MEDELLÍN",
}

const STORE_ID = "store-1"

function orderValueLadder(): SaveShippingZoneInput["rateLadder"] {
  return {
    basis: "order_value",
    ranges: [
      { from: "0", to: "50000", amount: "5000" },
      { from: "50000", to: "", amount: "0" },
    ],
  }
}

describe("saveShippingZone + listShippingZones", () => {
  it("saves a zone with two rate ranges and reads it back", async () => {
    const { supabase } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const saveResult = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Eje Cafetero",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: orderValueLadder(),
    })

    expect(saveResult.success).toBe(true)

    const zones = await listShippingZones(supabase as any, STORE_ID)

    expect(zones).toHaveLength(1)
    expect(zones[0]).toMatchObject({
      name: "Eje Cafetero",
      destinations: [
        { departmentCode: "05", departmentName: "ANTIOQUIA", municipalityCode: "05001", municipalityName: "MEDELLÍN" },
      ],
    })
    expect(zones[0].rateLadder).toEqual({
      basis: "order_value",
      ranges: [
        { from: "0", to: "50000", amount: "5000" },
        { from: "50000", to: "", amount: "0" },
      ],
    })
  })

  it("rejects a municipality already assigned to another zone of the same store, naming the conflicting zone", async () => {
    const { supabase, tables } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      shipping_zones: [{ id: "zone-north", store_id: STORE_ID, name: "Zona Norte" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-north", store_id: STORE_ID, department_code: "05", municipality_code: "05001" },
      ],
    })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Sur",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: { basis: "flat", amount: "5000" },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toContain("Zona Norte")
    expect(tables.get("shipping_zones")).toHaveLength(1)
  })

  it("rejects a ladder that leaves a gap between ranges", async () => {
    const { supabase, tables } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Gap",
      destinations: [{ departmentCode: "05", municipalityCode: null }],
      rateLadder: {
        basis: "order_value",
        ranges: [
          { from: "0", to: "10000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ],
      },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toMatch(/vacío/)
    expect(tables.get("shipping_zones") ?? []).toHaveLength(0)
  })

  it("rejects a ladder whose ranges overlap, naming the overlap (not a generic error)", async () => {
    const { supabase, tables } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Overlap",
      destinations: [{ departmentCode: "05", municipalityCode: null }],
      rateLadder: {
        basis: "order_value",
        ranges: [
          { from: "0", to: "30000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ],
      },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toMatch(/superpon/)
    expect(tables.get("shipping_zones") ?? []).toHaveLength(0)
  })

  // Deliberate, isolated from scenario 1's fixture (which also happens to
  // touch at 50000 but never asserts it): pins the half-open boundary
  // semantics -- a shared endpoint is neither a gap nor an overlap -- as its
  // own case, so a fixture change elsewhere can't silently drop coverage of it.
  it("accepts a ladder whose ranges touch exactly at the boundary", async () => {
    const { supabase } = createShippingSupabase({ co_locations: [ANTIOQUIA_MEDELLIN] })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Frontera",
      destinations: [{ departmentCode: "05", municipalityCode: null }],
      rateLadder: {
        basis: "order_value",
        ranges: [
          { from: "0", to: "20000", amount: "3000" },
          { from: "20000", to: "", amount: "0" },
        ],
      },
    })

    expect(result.success).toBe(true)
  })

  it("rejects activating a weight-based rate while a product still lacks weight (D8)", async () => {
    const { supabase } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      store_items: [{ id: "item-1", store_id: STORE_ID, item_name: "Café Especial", weight_grams: null }],
    })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Zona Peso",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: { basis: "weight", ranges: [{ from: "0", to: "", amount: "5000" }] },
    })

    expect(result.success).toBe(false)
    expect(!result.success && result.error).toMatch(/peso/)
  })

  it("lets a municipality destination coexist with a different zone that covers its whole department (D3: municipio wins)", async () => {
    const { supabase } = createShippingSupabase({
      co_locations: [ANTIOQUIA_MEDELLIN],
      shipping_zones: [{ id: "zone-department", store_id: STORE_ID, name: "Antioquia completa" }],
      shipping_zone_destinations: [
        { id: "dest-1", zone_id: "zone-department", store_id: STORE_ID, department_code: "05", municipality_code: null },
      ],
    })

    const result = await saveShippingZone(supabase as any, STORE_ID, {
      name: "Medellín exprés",
      destinations: [{ departmentCode: "05", municipalityCode: "05001" }],
      rateLadder: { basis: "flat", amount: "3000" },
    })

    expect(result.success).toBe(true)
  })
})

describe("deleteShippingZone", () => {
  it("only deletes a zone scoped to the authorized store", async () => {
    const { supabase, tables } = createShippingSupabase({
      shipping_zones: [
        { id: "zone-1", store_id: STORE_ID, name: "Zona 1" },
        { id: "zone-2", store_id: "other-store", name: "Zona 2" },
      ],
    })

    const otherStoreResult = await deleteShippingZone(supabase as any, STORE_ID, "zone-2")
    expect(otherStoreResult.success).toBe(false)
    expect(tables.get("shipping_zones")).toHaveLength(2)

    const ownStoreResult = await deleteShippingZone(supabase as any, STORE_ID, "zone-1")
    expect(ownStoreResult.success).toBe(true)
    expect(tables.get("shipping_zones")).toHaveLength(1)
  })
})
