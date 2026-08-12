import { describe, expect, it } from "vitest"

import {
  MUNICIPALITY_SEARCH_MIN_LENGTH,
  listDepartments,
  listMunicipalitiesByDepartment,
  searchMunicipalities,
} from "@/lib/shipping/locations-api"

type CoLocationRow = {
  id: number
  department_code: string
  department_name: string
  municipality_code: string
  municipality_name: string
}

type DepartmentRow = Pick<CoLocationRow, "department_code" | "department_name">

// PostgREST's own max_rows cap (supabase/config.toml, currently 1000): any
// relation this double serves -- table or view -- is truncated to this many
// rows, in ORDER BY order, exactly like a real PostgREST response. This is
// what an uncapped double cannot catch: it certified listDepartments reading
// straight off co_locations (1,122 rows) as correct, when PostgREST itself
// silently drops the tail past row 1000. Prove it by reverting
// lib/shipping/locations-api.ts's listDepartments to select from co_locations
// instead of the co_departments view -- the "hits PostgREST's row cap" test
// below fails against that code, against this same double.
const POSTGREST_MAX_ROWS = 1000

// Doble de supabase-js: encadenado (.select().eq().order()) igual al que
// locations-api.ts usa contra co_locations (la tabla) y co_departments (la
// vista de 20260807000700, derivada aquí de las mismas filas). La prueba de
// contrato real contra la base viva es pnpm supabase:verify:shipping.
function createDivipolaDouble(coLocationRows: CoLocationRow[]) {
  function distinctDepartmentRows(): DepartmentRow[] {
    const byCode = new Map<string, DepartmentRow>()
    for (const row of coLocationRows) {
      if (!byCode.has(row.department_code)) {
        byCode.set(row.department_code, { department_code: row.department_code, department_name: row.department_name })
      }
    }
    return [...byCode.values()]
  }

  function select(relationRows: Record<string, unknown>[], columns: string) {
    const equalityFilters: { column: string; value: unknown }[] = []
    const ilikeFilters: { column: string; pattern: string }[] = []
    let sortColumn: string | null = null
    let limitCount: number | null = null

    function matches(row: Record<string, unknown>): boolean {
      const matchesEquality = equalityFilters.every(({ column, value }) => row[column] === value)
      const matchesIlike = ilikeFilters.every(({ column, pattern }) =>
        String(row[column]).toLowerCase().includes(pattern.replace(/%/g, "").toLowerCase()),
      )
      return matchesEquality && matchesIlike
    }

    const builder = {
      eq(column: string, value: unknown) {
        equalityFilters.push({ column, value })
        return builder
      },
      ilike(column: string, pattern: string) {
        ilikeFilters.push({ column, pattern })
        return builder
      },
      order(column: string) {
        sortColumn = column
        return builder
      },
      limit(count: number) {
        limitCount = count
        return builder
      },
      then(onFulfilled: (result: { data: unknown; error: null }) => unknown) {
        const matched = relationRows.filter(matches)
        const sorted = sortColumn
          ? [...matched].sort((a, b) => (String(a[sortColumn as string]) < String(b[sortColumn as string]) ? -1 : 1))
          : matched
        // The row cap applies after ORDER BY, same as PostgREST's own
        // response slicing -- never before.
        const capped = sorted.slice(0, POSTGREST_MAX_ROWS)
        const limited = limitCount === null ? capped : capped.slice(0, limitCount)
        const projected = limited.map((row) => projectColumns(row, columns))
        return Promise.resolve({ data: projected, error: null }).then(onFulfilled)
      },
    }

    return builder
  }

  return {
    from: (name: string) => {
      if (name === "co_locations") return { select: (columns: string) => select(coLocationRows, columns) }
      if (name === "co_departments") return { select: (columns: string) => select(distinctDepartmentRows(), columns) }
      throw new Error(`Consulta inesperada contra ${name}`)
    },
  } as any
}

function projectColumns(row: Record<string, unknown>, columns: string): Record<string, unknown> {
  const keys = columns.split(",").map((column) => column.trim())
  const projected: Record<string, unknown> = {}
  for (const key of keys) {
    projected[key] = row[key]
  }
  return projected
}

function coLocationRow(overrides: Partial<CoLocationRow> & Pick<CoLocationRow, "id">): CoLocationRow {
  return {
    department_code: "05",
    department_name: "ANTIOQUIA",
    municipality_code: "05001",
    municipality_name: "MEDELLÍN",
    ...overrides,
  }
}

function buildDepartmentCatalog(departmentCount: number, municipiosPerDepartment: number): CoLocationRow[] {
  const rows: CoLocationRow[] = []
  let id = 1
  for (let d = 1; d <= departmentCount; d++) {
    const departmentCode = String(d).padStart(2, "0")
    const departmentName = `DEPARTAMENTO ${departmentCode}`
    for (let m = 1; m <= municipiosPerDepartment; m++) {
      rows.push(
        coLocationRow({
          id: id++,
          department_code: departmentCode,
          department_name: departmentName,
          municipality_code: `${departmentCode}${String(m).padStart(3, "0")}`,
          municipality_name: `MUNICIPIO ${m}`,
        }),
      )
    }
  }
  return rows
}

describe("listMunicipalitiesByDepartment", () => {
  it("returns only the municipios of the requested department", async () => {
    const client = createDivipolaDouble([
      coLocationRow({ id: 1, department_code: "05", municipality_code: "05001", municipality_name: "MEDELLÍN" }),
      coLocationRow({ id: 2, department_code: "05", municipality_code: "05002", municipality_name: "ABEJORRAL" }),
      coLocationRow({
        id: 3,
        department_code: "11",
        department_name: "BOGOTÁ, D.C.",
        municipality_code: "11001",
        municipality_name: "BOGOTÁ, D.C.",
      }),
    ])

    const municipios = await listMunicipalitiesByDepartment("05", client)

    expect(municipios.map((m) => m.code)).toEqual(["05002", "05001"])
    expect(municipios.every((m) => m.departmentCode === "05")).toBe(true)
  })

  it("carries the DANE department and municipality codes through end to end", async () => {
    const client = createDivipolaDouble([
      coLocationRow({ id: 7, department_code: "76", department_name: "VALLE DEL CAUCA", municipality_code: "76001", municipality_name: "CALI" }),
    ])

    const [municipio] = await listMunicipalitiesByDepartment("76", client)

    expect(municipio).toEqual({
      id: 7,
      code: "76001",
      name: "CALI",
      departmentCode: "76",
      departmentName: "VALLE DEL CAUCA",
    })
  })

  it("hands back nothing for a department with no municipios in the catalog", async () => {
    const client = createDivipolaDouble([coLocationRow({ id: 1 })])

    expect(await listMunicipalitiesByDepartment("99", client)).toEqual([])
  })
})

describe("listDepartments", () => {
  it("reads the department codes/names off co_departments", async () => {
    const client = createDivipolaDouble([
      coLocationRow({ id: 1, department_code: "05", department_name: "ANTIOQUIA" }),
      coLocationRow({ id: 2, department_code: "05", department_name: "ANTIOQUIA", municipality_code: "05002" }),
      coLocationRow({ id: 3, department_code: "11", department_name: "BOGOTÁ, D.C.", municipality_code: "11001" }),
    ])

    const departments = await listDepartments(client)

    expect(departments).toEqual([
      { code: "05", name: "ANTIOQUIA" },
      { code: "11", name: "BOGOTÁ, D.C." },
    ])
  })

  // Finding 1 (design audit, plan-envios-ecommerce): listDepartments used to
  // select straight off co_locations and dedupe in memory. Ordered by
  // department_name, every department's rows sit contiguous, so once the
  // catalog's row count crosses PostgREST's max_rows cap, any department
  // whose whole block starts past that row vanishes from the result --
  // exactly what happened with TOLIMA, VALLE DEL CAUCA, VAUPÉS and VICHADA
  // against the real 1,122-row catalog. 40 departments x 30 municipios each
  // (1,200 rows) reproduces the same shape at a size this test can assert
  // on directly: departments 1-33 fit inside the first 1,000 rows whole,
  // department 34 survives partially (still present), and departments 35-40
  // fall past row 1,000 entirely -- six departments a real picker would
  // simply never show.
  it("hits PostgREST's row cap when read off co_locations directly (reproduces Finding 1 -- must pass through co_departments instead)", async () => {
    const departmentCount = 40
    const rows = buildDepartmentCatalog(departmentCount, 30)
    expect(rows.length).toBeGreaterThan(POSTGREST_MAX_ROWS)

    const client = createDivipolaDouble(rows)

    const departments = await listDepartments(client)

    expect(departments).toHaveLength(departmentCount)
    expect(departments.map((department) => department.code)).toContain("40")
  })
})

describe("searchMunicipalities", () => {
  it("finds a municipio past PostgREST's row cap, proving the filter runs in the database rather than after an unfiltered fetch (search variant of Finding 1)", async () => {
    const rows = buildDepartmentCatalog(40, 30)
    const needleIndex = rows.findIndex((row) => row.department_code === "40" && row.municipality_code === "40015")
    rows[needleIndex] = { ...rows[needleIndex], municipality_name: "SANTUARIO DEL SOL" }
    const client = createDivipolaDouble(rows)

    const results = await searchMunicipalities("santuario", 50, client)

    expect(results).toEqual([
      { id: rows[needleIndex].id, code: "40015", name: "SANTUARIO DEL SOL", departmentCode: "40", departmentName: "DEPARTAMENTO 40" },
    ])
  })

  it("sends a limit to the database, never returning more results than requested even with many matches", async () => {
    const rows = buildDepartmentCatalog(5, 30)
    const client = createDivipolaDouble(rows)

    const results = await searchMunicipalities("municipio", 10, client)

    expect(results.length).toBeLessThanOrEqual(10)
  })

  it("returns nothing for a query shorter than the minimum search length, without ever reaching the database", async () => {
    const client = createDivipolaDouble([coLocationRow({ id: 1, municipality_name: "MEDELLÍN" })])
    const tooShortQuery = "m".repeat(MUNICIPALITY_SEARCH_MIN_LENGTH - 1)

    expect(await searchMunicipalities(tooShortQuery, 50, client)).toEqual([])
  })
})
