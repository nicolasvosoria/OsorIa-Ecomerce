import { describe, expect, it } from "vitest"

import { listDepartments, listMunicipalitiesByDepartment } from "@/lib/shipping/locations-api"

type CoLocationRow = {
  id: number
  department_code: string
  department_name: string
  municipality_code: string
  municipality_name: string
}

// Doble de ecommerce.co_locations: solo lectura, con el mismo shape de
// encadenado (.select().eq().order()) que expone supabase-js, para probar la
// lógica de locations-api.ts sin tocar Postgres. La prueba de contrato real
// contra la base viva es pnpm supabase:verify:shipping.
function createCoLocationsClient(rows: CoLocationRow[]) {
  function select(columns: string) {
    const filters: { column: keyof CoLocationRow; value: unknown }[] = []
    let sortColumn: keyof CoLocationRow | null = null

    const builder = {
      eq(column: keyof CoLocationRow, value: unknown) {
        filters.push({ column, value })
        return builder
      },
      order(column: keyof CoLocationRow) {
        sortColumn = column
        return builder
      },
      then(onFulfilled: (result: { data: unknown; error: null }) => unknown) {
        const matched = rows.filter((row) => filters.every(({ column, value }) => row[column] === value))
        const projected = matched.map((row) => projectColumns(row, columns))
        const sorted = sortColumn
          ? [...projected].sort((a, b) =>
              String(a[sortColumn as string]) < String(b[sortColumn as string]) ? -1 : 1,
            )
          : projected
        return Promise.resolve({ data: sorted, error: null }).then(onFulfilled)
      },
    }

    return builder
  }

  return { from: (name: string) => {
    if (name !== "co_locations") {
      throw new Error(`Consulta inesperada contra ${name}`)
    }
    return { select }
  } } as any
}

function projectColumns(row: CoLocationRow, columns: string): Record<string, unknown> {
  const keys = columns.split(",").map((column) => column.trim())
  const projected: Record<string, unknown> = {}
  for (const key of keys) {
    projected[key] = row[key as keyof CoLocationRow]
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

describe("listMunicipalitiesByDepartment", () => {
  it("returns only the municipios of the requested department", async () => {
    const client = createCoLocationsClient([
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
    const client = createCoLocationsClient([
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
    const client = createCoLocationsClient([coLocationRow({ id: 1 })])

    expect(await listMunicipalitiesByDepartment("99", client)).toEqual([])
  })
})

describe("listDepartments", () => {
  it("deduplicates the department columns every municipio row carries", async () => {
    const client = createCoLocationsClient([
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
})
