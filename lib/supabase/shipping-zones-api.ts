import { ECOMMERCE_TABLES, ECOMMERCE_VIEWS } from "./contract"
import {
  findShippingLadderGaps,
  type ShippingRateBasis,
  type ShippingRateLadder,
  type ShippingZoneDestinationInput,
} from "@/lib/shipping/schemas"

export type MissingWeightProduct = { id: string; name: string }

export type ShippingZoneDestinationView = {
  departmentCode: string
  departmentName: string
  municipalityCode: string | null
  municipalityName: string | null
}

export type ShippingZoneRecord = {
  id: string
  name: string
  destinations: ShippingZoneDestinationView[]
  rateLadder: ShippingRateLadder
}

export type SaveShippingZoneInput = {
  name: string
  destinations: ShippingZoneDestinationInput[]
  rateLadder: ShippingRateLadder
}

// Shared by saveShippingZone and deleteShippingZone below: whether the
// mutation landed, and -- only when it didn't for a reason the owner needs
// to act on (a gap in the ladder, a destination conflict, D8's missing-weight
// gate) -- the specific message to show. A generic infrastructure failure
// leaves error unset so the caller's own translated copy (shipping.zones.
// saveErrorToast/deleteErrorToast in lib/i18n/translations.ts) is what
// renders, instead of a hardcoded duplicate of that same message.
export type ShippingZoneMutationResult = { success: boolean; error?: string }

// D8: "missing weight" means a product whose BASE weight is null -- a
// variant override never rescues a product from this list, per the ledger.
// A14: a combo has no weight_grams of its own (it weighs what its
// components weigh), so this also flags a component product that lacks one
// -- otherwise a store selling combos could activate a weight-based zone
// with nothing warning it that every combo checkout is about to fail.
export async function findMissingWeightProducts(
  supabase: any,
  storeId: string,
): Promise<MissingWeightProduct[]> {
  const [directResult, comboComponentProducts] = await Promise.all([
    supabase.from(ECOMMERCE_TABLES.storeItems).select("id, item_name").eq("store_id", storeId).is("weight_grams", null),
    findMissingWeightComboComponentProducts(supabase, storeId),
  ])

  if (directResult.error) {
    throw new Error("No se pudieron leer los productos sin peso", { cause: directResult.error })
  }

  const byId = new Map<string, MissingWeightProduct>()
  for (const row of directResult.data ?? []) {
    byId.set(row.id, { id: row.id, name: row.item_name })
  }
  for (const product of comboComponentProducts) {
    byId.set(product.id, product)
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// product_combo_components carries no store_id of its own -- scoping through
// the owning combo's store_id (rather than assuming a component's product
// already lives in this same store) is what makes this exhaustive.
async function findMissingWeightComboComponentProducts(
  supabase: any,
  storeId: string,
): Promise<MissingWeightProduct[]> {
  const combosResult = await supabase.from(ECOMMERCE_TABLES.productCombos).select("id").eq("store_id", storeId)
  if (combosResult.error) {
    throw new Error("No se pudieron leer los combos de la tienda", { cause: combosResult.error })
  }

  const comboIds = (combosResult.data ?? []).map((row: any) => row.id)
  if (comboIds.length === 0) return []

  const componentsResult = await supabase
    .from(ECOMMERCE_TABLES.productComboComponents)
    .select("product_id")
    .in("combo_id", comboIds)
  if (componentsResult.error) {
    throw new Error("No se pudieron leer los componentes de los combos", { cause: componentsResult.error })
  }

  const componentProductIds = [...new Set((componentsResult.data ?? []).map((row: any) => row.product_id))]
  if (componentProductIds.length === 0) return []

  const productsResult = await supabase
    .from(ECOMMERCE_TABLES.storeItems)
    .select("id, item_name")
    .in("id", componentProductIds)
    .is("weight_grams", null)
  if (productsResult.error) {
    throw new Error("No se pudieron leer los productos de los combos sin peso", { cause: productsResult.error })
  }

  return (productsResult.data ?? []).map((row: any) => ({ id: row.id, name: row.item_name }))
}

export async function listShippingZones(supabase: any, storeId: string): Promise<ShippingZoneRecord[]> {
  const zonesResult = await supabase
    .from(ECOMMERCE_TABLES.shippingZones)
    .select("id, name")
    .eq("store_id", storeId)
    .order("name")

  if (zonesResult.error) {
    throw new Error("No se pudieron leer las zonas de envío", { cause: zonesResult.error })
  }

  const zones: { id: string; name: string }[] = zonesResult.data ?? []
  if (zones.length === 0) return []

  const zoneIds = zones.map((zone) => zone.id)

  const [destinationsResult, ratesResult] = await Promise.all([
    supabase
      .from(ECOMMERCE_TABLES.shippingZoneDestinations)
      .select("zone_id, department_code, municipality_code")
      .in("zone_id", zoneIds),
    supabase
      .from(ECOMMERCE_TABLES.shippingRates)
      .select("zone_id, basis, range_from, range_to, amount")
      .in("zone_id", zoneIds),
  ])

  if (destinationsResult.error) {
    throw new Error("No se pudieron leer los destinos de las zonas", { cause: destinationsResult.error })
  }
  if (ratesResult.error) {
    throw new Error("No se pudieron leer las tarifas de las zonas", { cause: ratesResult.error })
  }

  const destinationRows: any[] = destinationsResult.data ?? []
  const rateRows: any[] = ratesResult.data ?? []
  const locationNames = await resolveLocationNames(supabase, destinationRows)

  return zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    destinations: destinationRows
      .filter((row) => row.zone_id === zone.id)
      .map((row) => toDestinationView(row, locationNames)),
    rateLadder: rateRowsToLadder(rateRows.filter((row) => row.zone_id === zone.id)),
  }))
}

export async function saveShippingZone(
  supabase: any,
  storeId: string,
  input: SaveShippingZoneInput,
  zoneId?: string,
): Promise<ShippingZoneMutationResult> {
  const gapIssues = findShippingLadderGaps(input.rateLadder)
  if (gapIssues.length > 0) {
    return { success: false, error: gapIssues[0].message }
  }

  if (input.rateLadder.basis === "weight") {
    const missingWeightProducts = await findMissingWeightProducts(supabase, storeId)
    if (missingWeightProducts.length > 0) {
      return {
        success: false,
        error: `No puedes activar una tarifa por peso: ${missingWeightProducts.length} producto(s) todavía no tienen peso cargado.`,
      }
    }
  }

  const conflictError = await findDestinationConflictError(supabase, storeId, input.destinations, zoneId)
  if (conflictError) {
    return { success: false, error: conflictError }
  }

  const zoneRow = zoneId
    ? await updateZoneRow(supabase, storeId, zoneId, input.name)
    : await insertZoneRow(supabase, storeId, input.name)
  if (!zoneRow) {
    return { success: false }
  }

  const destinationsSaved = await replaceZoneDestinations(supabase, storeId, zoneRow.id, input.destinations)
  const ratesSaved = destinationsSaved && (await replaceZoneRates(supabase, zoneRow.id, input.rateLadder))

  if (!destinationsSaved || !ratesSaved) {
    // Solo la creación se revierte por completo: no había nada que la
    // sobreviviera. Una edición fallida puede dejar destinos o tarifas a
    // medio reemplazar -- el mismo nivel de atomicidad best-effort que
    // createCombo/updateCombo ya aceptan en este repo, sin una transacción
    // real de por medio.
    if (!zoneId) {
      await deleteZoneRow(supabase, storeId, zoneRow.id).catch(() => undefined)
    }
    return { success: false }
  }

  return { success: true }
}

export async function deleteShippingZone(
  supabase: any,
  storeId: string,
  zoneId: string,
): Promise<ShippingZoneMutationResult> {
  const result = await supabase
    .from(ECOMMERCE_TABLES.shippingZones)
    .delete()
    .eq("id", zoneId)
    .eq("store_id", storeId)
    .select("id")
    .single()

  if (result.error || !result.data) {
    return { success: false }
  }
  return { success: true }
}

async function insertZoneRow(
  supabase: any,
  storeId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const result = await supabase
    .from(ECOMMERCE_TABLES.shippingZones)
    .insert({ store_id: storeId, name })
    .select("id, name")
    .single()

  return result.error ? null : result.data
}

async function updateZoneRow(
  supabase: any,
  storeId: string,
  zoneId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const result = await supabase
    .from(ECOMMERCE_TABLES.shippingZones)
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", zoneId)
    .eq("store_id", storeId)
    .select("id, name")
    .single()

  return result.error ? null : result.data
}

async function deleteZoneRow(supabase: any, storeId: string, zoneId: string): Promise<void> {
  await supabase.from(ECOMMERCE_TABLES.shippingZones).delete().eq("id", zoneId).eq("store_id", storeId)
}

async function replaceZoneDestinations(
  supabase: any,
  storeId: string,
  zoneId: string,
  destinations: ShippingZoneDestinationInput[],
): Promise<boolean> {
  const deleteResult = await supabase.from(ECOMMERCE_TABLES.shippingZoneDestinations).delete().eq("zone_id", zoneId)
  if (deleteResult.error) return false

  const rows = destinations.map((destination) => ({
    zone_id: zoneId,
    store_id: storeId,
    department_code: destination.departmentCode,
    municipality_code: destination.municipalityCode,
  }))
  const insertResult = await supabase.from(ECOMMERCE_TABLES.shippingZoneDestinations).insert(rows)
  return !insertResult.error
}

async function replaceZoneRates(supabase: any, zoneId: string, ladder: ShippingRateLadder): Promise<boolean> {
  const deleteResult = await supabase.from(ECOMMERCE_TABLES.shippingRates).delete().eq("zone_id", zoneId)
  if (deleteResult.error) return false

  const rows = ladderToRateRows(ladder).map((row) => ({ zone_id: zoneId, ...row }))
  const insertResult = await supabase.from(ECOMMERCE_TABLES.shippingRates).insert(rows)
  return !insertResult.error
}

type ExistingDestination = { zoneId: string; departmentCode: string; municipalityCode: string | null }

async function fetchStoreDestinations(
  supabase: any,
  storeId: string,
  excludeZoneId?: string,
): Promise<ExistingDestination[]> {
  let query = supabase
    .from(ECOMMERCE_TABLES.shippingZoneDestinations)
    .select("zone_id, department_code, municipality_code")
    .eq("store_id", storeId)

  if (excludeZoneId) {
    query = query.neq("zone_id", excludeZoneId)
  }

  const result = await query
  if (result.error) {
    throw new Error("No se pudieron leer los destinos existentes", { cause: result.error })
  }

  return (result.data ?? []).map((row: any) => ({
    zoneId: row.zone_id,
    departmentCode: row.department_code,
    municipalityCode: row.municipality_code,
  }))
}

// D3: a municipio destination never conflicts with a department-level
// destination that happens to cover it (the municipio wins over its
// department) -- only an exact match on the same (department, municipality)
// pair is a conflict.
function findConflictingDestination(
  destination: ShippingZoneDestinationInput,
  existing: ExistingDestination[],
): ExistingDestination | undefined {
  return existing.find(
    (row) =>
      row.departmentCode === destination.departmentCode &&
      row.municipalityCode === destination.municipalityCode,
  )
}

// D3: rejected "with the conflicting zone named" -- fetched once a conflict
// is actually found, so the common (no-conflict) save path never pays for it.
async function describeDestination(supabase: any, destination: ShippingZoneDestinationInput): Promise<string> {
  let query = supabase
    .from(ECOMMERCE_TABLES.coLocations)
    .select("department_name, municipality_name")
    .eq("department_code", destination.departmentCode)

  if (destination.municipalityCode) {
    query = query.eq("municipality_code", destination.municipalityCode)
  }

  const result = await query.limit(1).maybeSingle()
  const departmentName = result.data?.department_name ?? destination.departmentCode

  if (!destination.municipalityCode) {
    return `Todo el departamento de ${departmentName}`
  }
  return `${result.data?.municipality_name ?? destination.municipalityCode} (${departmentName})`
}

async function findDestinationConflictError(
  supabase: any,
  storeId: string,
  destinations: ShippingZoneDestinationInput[],
  excludeZoneId?: string,
): Promise<string | undefined> {
  const existingDestinations = await fetchStoreDestinations(supabase, storeId, excludeZoneId)

  for (const destination of destinations) {
    const conflict = findConflictingDestination(destination, existingDestinations)
    if (!conflict) continue

    const [label, zoneName] = await Promise.all([
      describeDestination(supabase, destination),
      fetchZoneName(supabase, conflict.zoneId),
    ])
    return `${label} ya está asignado a la zona "${zoneName}".`
  }

  return undefined
}

async function fetchZoneName(supabase: any, zoneId: string): Promise<string> {
  const result = await supabase.from(ECOMMERCE_TABLES.shippingZones).select("name").eq("id", zoneId).maybeSingle()
  return result.data?.name ?? "otra zona"
}

type LocationNames = { departments: Map<string, string>; municipalities: Map<string, string> }
type DestinationCodeRow = { department_code: string; municipality_code: string | null }

// Two targeted queries, not one over-fetching one: querying co_locations by
// department_code alone pulls every municipio of every matched department
// (up to co_locations' full 1,122 rows) only to discard most of them here --
// a store whose zones span enough departments crosses PostgREST's max_rows
// cap (supabase/config.toml) and the excess rows are truncated before this
// function ever sees them, degrading destination badges to raw DANE codes.
// Department names come from co_departments (33 rows, can't truncate);
// municipality names are looked up by the exact codes this function needs,
// nothing broader.
async function resolveLocationNames(supabase: any, destinationRows: DestinationCodeRow[]): Promise<LocationNames> {
  const departmentCodes = [...new Set(destinationRows.map((row) => row.department_code))]
  const municipalityCodes = [
    ...new Set(destinationRows.map((row) => row.municipality_code).filter((code): code is string => Boolean(code))),
  ]

  const departments = new Map<string, string>()
  const municipalities = new Map<string, string>()
  if (departmentCodes.length === 0) {
    return { departments, municipalities }
  }

  const [departmentsResult, municipalitiesResult] = await Promise.all([
    supabase.from(ECOMMERCE_VIEWS.coDepartments).select("department_code, department_name").in("department_code", departmentCodes),
    municipalityCodes.length === 0
      ? Promise.resolve({ data: [] })
      : supabase.from(ECOMMERCE_TABLES.coLocations).select("municipality_code, municipality_name").in("municipality_code", municipalityCodes),
  ])

  for (const row of departmentsResult.data ?? []) {
    departments.set(row.department_code, row.department_name)
  }
  for (const row of municipalitiesResult.data ?? []) {
    municipalities.set(row.municipality_code, row.municipality_name)
  }

  return { departments, municipalities }
}

function toDestinationView(row: DestinationCodeRow, names: LocationNames): ShippingZoneDestinationView {
  return {
    departmentCode: row.department_code,
    departmentName: names.departments.get(row.department_code) ?? row.department_code,
    municipalityCode: row.municipality_code,
    municipalityName: row.municipality_code ? names.municipalities.get(row.municipality_code) ?? row.municipality_code : null,
  }
}

type ShippingRateRow = {
  basis: ShippingRateBasis
  range_from: number | null
  range_to: number | null
  amount: number
}

function ladderToRateRows(ladder: ShippingRateLadder): ShippingRateRow[] {
  if (ladder.basis === "flat") {
    return [{ basis: "flat", range_from: null, range_to: null, amount: Number(ladder.amount) }]
  }

  return ladder.ranges.map((range) => ({
    basis: ladder.basis,
    range_from: Number(range.from),
    range_to: range.to.trim() === "" ? null : Number(range.to),
    amount: Number(range.amount),
  }))
}

// basis comes back from the DB as a plain string, never pre-narrowed to
// ShippingRateBasis -- the switch below is what actually checks it belongs
// to the union (shipping_rates_basis_chk guarantees it in practice, but the
// type system doesn't know that, so an unrecognized value fails loudly
// instead of laundering into a plausible-looking ladder).
type RawShippingRateRow = { basis: string; range_from: number | null; range_to: number | null; amount: number }

function rateRowsToRanges(rows: RawShippingRateRow[]) {
  return [...rows]
    .sort((a, b) => (a.range_from ?? 0) - (b.range_from ?? 0))
    .map((row) => ({
      from: String(row.range_from ?? 0),
      to: row.range_to === null ? "" : String(row.range_to),
      amount: String(row.amount),
    }))
}

function rateRowsToLadder(rows: RawShippingRateRow[]): ShippingRateLadder {
  const basis = rows[0]?.basis ?? "flat"

  switch (basis) {
    case "flat":
      return { basis: "flat", amount: String(rows[0]?.amount ?? 0) }
    case "order_value":
      return { basis: "order_value", ranges: rateRowsToRanges(rows) }
    case "weight":
      return { basis: "weight", ranges: rateRowsToRanges(rows) }
    default:
      throw new Error(`Zona de envío con basis de tarifa desconocido: ${basis}`)
  }
}
