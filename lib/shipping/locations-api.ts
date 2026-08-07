import { getSupabaseEcommerce } from "@/lib/supabase/client"
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { withTimeout } from "@/lib/supabase/with-timeout"

export type Department = {
  code: string
  name: string
}

export type Municipality = {
  id: number
  code: string
  name: string
  departmentCode: string
  departmentName: string
}

type CoLocationRow = {
  id: number
  department_code: string
  department_name: string
  municipality_code: string
  municipality_name: string
}

type EcommerceClient = ReturnType<typeof getSupabaseEcommerce>

const LOCATIONS_TIMEOUT_MS = 15000

function coLocations(client: NonNullable<EcommerceClient>) {
  return client.from(ECOMMERCE_TABLES.coLocations)
}

// D1: co_locations is the only table (no separate departments table), so the
// 33 departments are read off the same denormalized columns every municipio
// row already carries, deduplicated here in memory.
export async function listDepartments(
  client: EcommerceClient = getSupabaseEcommerce(),
): Promise<Department[]> {
  if (!client) return []

  const result = (await withTimeout(
    coLocations(client).select("department_code, department_name").order("department_name"),
    LOCATIONS_TIMEOUT_MS,
    "listDepartments",
  )) as { data: Pick<CoLocationRow, "department_code" | "department_name">[] | null; error: any }

  if (result.error) {
    throw new Error(`No se pudieron leer los departamentos: ${result.error.message}`)
  }

  const byCode = new Map<string, Department>()
  for (const row of result.data ?? []) {
    if (!byCode.has(row.department_code)) {
      byCode.set(row.department_code, { code: row.department_code, name: row.department_name })
    }
  }

  return [...byCode.values()]
}

// D28's second chained select: municipios filtered to one department. The
// DANE code (municipality_code) and its department_code travel through
// untouched so a later order can freeze the exact Divipola pair (D2/D30).
export async function listMunicipalitiesByDepartment(
  departmentCode: string,
  client: EcommerceClient = getSupabaseEcommerce(),
): Promise<Municipality[]> {
  if (!client) return []

  const result = (await withTimeout(
    coLocations(client)
      .select("id, department_code, department_name, municipality_code, municipality_name")
      .eq("department_code", departmentCode)
      .order("municipality_name"),
    LOCATIONS_TIMEOUT_MS,
    "listMunicipalitiesByDepartment",
  )) as { data: CoLocationRow[] | null; error: any }

  if (result.error) {
    throw new Error(`No se pudieron leer los municipios: ${result.error.message}`)
  }

  return (result.data ?? []).map(toMunicipality)
}

function toMunicipality(row: CoLocationRow): Municipality {
  return {
    id: row.id,
    code: row.municipality_code,
    name: row.municipality_name,
    departmentCode: row.department_code,
    departmentName: row.department_name,
  }
}
