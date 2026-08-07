// Doble en memoria de supabase-js, con el mismo encadenado
// (.select/.eq/.neq/.in/.is/.order/.limit/.single/.maybeSingle) que
// lib/supabase/shipping-zones-api.ts, lib/supabase/shipping-settings-api.ts
// y lib/shipping/resolver.ts usan contra insert/update/delete/select reales,
// para probar su lógica (guardar+leer zonas, resolver una cotización de
// envío) sin tocar Postgres. La prueba de contrato real contra la base viva
// es pnpm supabase:verify:shipping. Extraído de tests/shipping/zones-api.test.ts
// para que resolver.test.ts lo reuse en vez de duplicarlo.
export type Row = Record<string, unknown>

// co_departments es una vista real sobre co_locations (ver la migración
// 20260807000700): un fixture nunca la siembra por separado, se deriva de
// co_locations cada vez que se consulta, igual que en Postgres.
const CO_LOCATIONS_TABLE = "co_locations"
const CO_DEPARTMENTS_VIEW = "co_departments"

export function createShippingSupabase(seed: Record<string, Row[]> = {}) {
  const tables = new Map<string, Row[]>(Object.entries(seed).map(([table, rows]) => [table, [...rows]]))
  let nextId = 1

  function table(name: string): Row[] {
    if (!tables.has(name)) tables.set(name, [])
    return tables.get(name)!
  }

  function deriveCoDepartments(): Row[] {
    const byCode = new Map<string, Row>()
    for (const row of table(CO_LOCATIONS_TABLE)) {
      const code = row.department_code as string
      if (!byCode.has(code)) {
        byCode.set(code, { department_code: code, department_name: row.department_name })
      }
    }
    return [...byCode.values()]
  }

  function from(name: string) {
    const rows = name === CO_DEPARTMENTS_VIEW ? deriveCoDepartments() : table(name)
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
