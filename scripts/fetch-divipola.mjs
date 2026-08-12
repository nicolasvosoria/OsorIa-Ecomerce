#!/usr/bin/env node
// Fetches Colombia's official DANE Divipola dataset (33 departments, 1,122
// municipios) from Socrata and prints the seed SQL that lands, hand-pasted,
// inside supabase/migrations/20260807000100_ecommerce_co_locations.sql (D1:
// a migration must never make a network call, so this script -- not the
// migration -- is the one place that touches it, run by hand once).
//
// Usage:
//   node scripts/fetch-divipola.mjs > /tmp/co_locations_seed.sql
//
// Socrata's default page size is 1,000, well under the 1,122 total, so this
// pages with $limit/$offset rather than trusting a single request, and
// refuses to print anything unless the total matches DANE's own count --
// a truncated or duplicated fetch must never silently become a seed.
import process from "node:process"

const SOURCE_URL = "https://www.datos.gov.co/resource/gdxc-w37w.json"
const EXPECTED_ROW_COUNT = 1122
const PAGE_SIZE = 1000

async function fetchAllRows() {
  const rows = []
  let offset = 0

  for (;;) {
    const url = `${SOURCE_URL}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=cod_mpio`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`DANE Divipola request failed: ${response.status} ${response.statusText}`)
    }

    const page = await response.json()
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return rows
}

// Socrata serves longitud/latitud with a comma decimal separator (e.g.
// "-75,581775"); Postgres numeric literals need a dot.
function normalizeDecimal(value) {
  if (typeof value !== "string" || value.trim() === "") return null
  return value.replace(",", ".")
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlNumberOrNull(value) {
  const normalized = normalizeDecimal(value)
  return normalized === null ? "null" : normalized
}

function toValuesTuple(row) {
  return `(${sqlString(row.cod_dpto)}, ${sqlString(row.dpto)}, ${sqlString(row.cod_mpio)}, ${sqlString(row.nom_mpio)}, ${sqlString(row.tipo_municipio)}, ${sqlNumberOrNull(row.longitud)}, ${sqlNumberOrNull(row.latitud)})`
}

async function main() {
  const rows = await fetchAllRows()

  if (rows.length !== EXPECTED_ROW_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_ROW_COUNT} municipios from DANE Divipola, got ${rows.length}. Refusing to print a seed that might be truncated or duplicated.`,
    )
  }

  const tuples = rows.map(toValuesTuple).join(",\n  ")

  // do update, not do nothing: keeps a re-run idempotent AND lets a DANE
  // name or classification correction propagate on the next re-run. The
  // (department_code, municipality_code) match itself never needs
  // re-setting; department_name/municipality_name/municipality_type are the
  // columns DANE actually corrects over time (see the migration this seed
  // is pasted into).
  console.log(
    `insert into ecommerce.co_locations\n  (department_code, department_name, municipality_code, municipality_name, municipality_type, longitude, latitude)\nvalues\n  ${tuples}\non conflict (department_code, municipality_code) do update set\n  department_name = excluded.department_name,\n  municipality_name = excluded.municipality_name,\n  municipality_type = excluded.municipality_type,\n  updated_at = excluded.updated_at;`,
  )
}

main().catch((error) => {
  console.error("[fetch-divipola]", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
