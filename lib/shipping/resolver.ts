import { translations } from "@/lib/i18n/translations"
import { resolveWeightGrams } from "@/lib/products/adapter"
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { loadShippingSettings } from "@/lib/supabase/shipping-settings-api"
import { withTimeout } from "@/lib/supabase/with-timeout"
import type {
  ShippingDestination,
  ShippingMode,
  ShippingRateBasis,
  ShippingResolutionStatus,
  UnmatchedDestinationAction,
} from "@/lib/shipping/schemas"

export type ShippingResolutionItem = {
  productId: string | null
  variantId: string | null
  // A14: a combo order item carries productId/variantId null (it isn't
  // itself a catalog row) and this instead -- resolveOrderWeightGrams
  // expands it into its real components rather than treating it as
  // unweighable.
  comboId: string | null
  productName: string
  quantity: number
}

export type ShippingResolutionInput = {
  storeId: string
  destination: ShippingDestination
  subtotal: number
  items: ShippingResolutionItem[]
}

export type ShippingResolution = {
  status: ShippingResolutionStatus
  amount: number
}

const SHIPPING_RESOLUTION_TIMEOUT_MS = 15000

// D31: sourced from translations.es.checkout.shippingBlocked -- the same key
// app/checkout/page.tsx's renderShippingQuote already shows via the
// "blocked" kind use-shipping-quote.ts derives from an instanceof check on
// this error -- instead of an independent hardcoded copy of the same
// meaning. This module has no request-scoped locale to thread through
// (lib/shipping/schemas.ts's REQUIRED_DEPARTMENT_MESSAGE is the same
// precedent), so "es" is the fixed default.
const UNSERVED_DESTINATION_MESSAGE = translations.es.checkout.shippingBlocked

// D7: a caller that needs to tell "the store blocked this destination" apart
// from any other resolution failure (a live checkout quote, say, deciding
// whether to show the honest block copy or a generic retry message) can't
// re-derive that from a plain Error without re-implementing the zone lookup
// D19 already forbids duplicating -- this is the one thing to instanceof.
export class UnservedDestinationError extends Error {
  constructor() {
    super(UNSERVED_DESTINATION_MESSAGE)
    this.name = "UnservedDestinationError"
  }
}

// D19: the seam every strategy plugs into -- own_rates (below) is the first
// and, until the aggregator lands, only real one. Both createOrder
// (lib/supabase/orders-api.ts) and the live checkout preview
// (app/checkout/actions.ts's getCheckoutShippingQuote) call exactly this
// function, never their own copy of "find the zone, apply the ladder", so
// they structurally cannot disagree (the bug this whole design exists to
// prevent). D7's block/allow decision is applied here too, uniformly: a
// caller only ever sees "out_of_zone" when the store's own setting allows
// the sale through anyway.
export async function resolveShipping(
  supabase: any,
  input: ShippingResolutionInput,
): Promise<ShippingResolution> {
  const settings = await loadShippingSettings(supabase, input.storeId)
  const resolution = await resolveByMode(supabase, settings.mode, input)

  return enforceUnmatchedDestinationPolicy(resolution, settings.unmatchedDestinationAction)
}

async function resolveByMode(
  supabase: any,
  mode: ShippingMode,
  input: ShippingResolutionInput,
): Promise<ShippingResolution> {
  if (mode === "coordinate") return resolveCoordinateShipping()
  if (mode === "own_rates") return resolveOwnRatesShipping(supabase, input)

  // D11/D19: the admin selector never offers auto_quote, so no store can be
  // in this mode today -- reaching here means the model outran its only
  // strategy. Fail loudly instead of guessing a price for a mode nothing
  // implements yet; roadmap child 2 replaces this branch with the real call,
  // own_rates (above) as its fallback.
  throw new Error(`El modo de envío "${mode}" todavía no tiene una estrategia de cotización.`)
}

// D11/D17: the born default, and the only mode the one live public store
// uses -- pure and IO-free on purpose, so a coordinate-mode order never pays
// for a zone lookup it will never need.
function resolveCoordinateShipping(): ShippingResolution {
  return { status: "agreed", amount: 0 }
}

function enforceUnmatchedDestinationPolicy(
  resolution: ShippingResolution,
  unmatchedDestinationAction: UnmatchedDestinationAction,
): ShippingResolution {
  if (resolution.status !== "out_of_zone") return resolution
  if (unmatchedDestinationAction === "block") {
    throw new UnservedDestinationError()
  }
  return resolution
}

// D3/D5/D6: own_rates, the first real strategy. A matching zone's ladder
// always resolves to a status: a positive amount is "rate", an amount of
// exactly 0 is "free" (D6 -- free shipping is the ladder's own top rung,
// never a special case here).
async function resolveOwnRatesShipping(
  supabase: any,
  input: ShippingResolutionInput,
): Promise<ShippingResolution> {
  const zoneId = await findMatchingZoneId(supabase, input.storeId, input.destination)
  if (!zoneId) {
    return { status: "out_of_zone", amount: 0 }
  }

  const ladder = await loadZoneLadder(supabase, zoneId)
  const amount = await amountForZoneLadder(supabase, ladder, input)

  return { status: amount > 0 ? "rate" : "free", amount }
}

type ShippingZoneDestinationRow = { zone_id: string }

// D3: the municipio destination wins over a department destination that also
// covers it -- checked first, so a matching municipio short-circuits the
// department lookup below instead of requiring both to agree. D3's own
// partial unique indexes (20260807000500) guarantee at most one zone claims
// a given (store, department[, municipality]) pair, so .maybeSingle() can
// never see more than one row.
async function findMatchingZoneId(
  supabase: any,
  storeId: string,
  destination: ShippingDestination,
): Promise<string | null> {
  const municipalityMatch = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.shippingZoneDestinations)
      .select("zone_id")
      .eq("store_id", storeId)
      .eq("department_code", destination.departmentCode)
      .eq("municipality_code", destination.municipalityCode)
      .maybeSingle(),
    SHIPPING_RESOLUTION_TIMEOUT_MS,
    "findMatchingZoneId:municipality",
  )) as { data: ShippingZoneDestinationRow | null; error: any }

  if (municipalityMatch.error) {
    throw new Error("No se pudo resolver la zona de envío del destino", { cause: municipalityMatch.error })
  }
  if (municipalityMatch.data) {
    return municipalityMatch.data.zone_id
  }

  const departmentMatch = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.shippingZoneDestinations)
      .select("zone_id")
      .eq("store_id", storeId)
      .eq("department_code", destination.departmentCode)
      .is("municipality_code", null)
      .maybeSingle(),
    SHIPPING_RESOLUTION_TIMEOUT_MS,
    "findMatchingZoneId:department",
  )) as { data: ShippingZoneDestinationRow | null; error: any }

  if (departmentMatch.error) {
    throw new Error("No se pudo resolver la zona de envío del destino", { cause: departmentMatch.error })
  }
  return departmentMatch.data?.zone_id ?? null
}

type ShippingRateRow = {
  basis: ShippingRateBasis
  range_from: number | null
  range_to: number | null
  amount: number
}

// basis comes back from the DB as a plain string, never pre-narrowed to
// ShippingRateBasis -- narrowed here the same way shipping-zones-api.ts's
// rateRowsToLadder narrows it (shipping_rates_basis_chk guarantees it in
// practice, but the type system doesn't know that). This one guards the
// PRICING path itself: amountForZoneLadder below prices off input.subtotal
// whenever basis isn't "weight", so an unrecognized value laundered past
// this point would silently bill the buyer off the wrong number instead of
// failing loudly.
type RawShippingRateRow = { basis: string; range_from: number | null; range_to: number | null; amount: number }

function toShippingRateRow(row: RawShippingRateRow): ShippingRateRow {
  switch (row.basis) {
    case "flat":
    case "order_value":
    case "weight":
      return { ...row, basis: row.basis }
    default:
      throw new Error(`Tarifa de envío con basis desconocido: ${row.basis}`)
  }
}

async function loadZoneLadder(supabase: any, zoneId: string): Promise<ShippingRateRow[]> {
  const result = (await withTimeout(
    supabase.from(ECOMMERCE_TABLES.shippingRates).select("basis, range_from, range_to, amount").eq("zone_id", zoneId),
    SHIPPING_RESOLUTION_TIMEOUT_MS,
    "loadZoneLadder",
  )) as { data: RawShippingRateRow[] | null; error: any }

  if (result.error) {
    throw new Error("No se pudo leer la escalera de tarifas de la zona", { cause: result.error })
  }
  return (result.data ?? []).map(toShippingRateRow)
}

// D5/D6: S7 already blocks SAVING an incomplete ladder (findShippingLadderGaps
// in lib/shipping/schemas.ts), so reaching a value this ladder doesn't cover
// means it was corrupted after the fact (a direct DB edit, say) -- fail
// loudly instead of silently guessing a price, the same fail-closed posture
// resolveAuthoritativeShippingDestination already takes in orders-api.ts.
// Ranges are half-open ([from, to)): a value exactly on a shared boundary
// belongs to the range that STARTS there, matching findShippingLadderGaps'
// own "a shared endpoint is neither a gap nor an overlap" rule.
async function amountForZoneLadder(
  supabase: any,
  ladder: ShippingRateRow[],
  input: ShippingResolutionInput,
): Promise<number> {
  const basis = ladder[0]?.basis
  if (!basis) {
    throw new Error("La zona de envío del destino no tiene una tarifa configurada")
  }
  if (basis === "flat") {
    return Number(ladder[0].amount)
  }

  const value = basis === "weight" ? await resolveOrderWeightGrams(supabase, input.items) : input.subtotal
  const matchingRange = ladder.find(
    (range) => value >= (range.range_from ?? 0) && (range.range_to === null || value < range.range_to),
  )
  if (!matchingRange) {
    throw new Error("La escalera de tarifas de la zona no cubre el valor de este pedido")
  }
  return Number(matchingRange.amount)
}

type VariantWeightRow = { weightGrams: number | null; itemId: string }

async function fetchVariantWeights(supabase: any, variantIds: string[]): Promise<Map<string, VariantWeightRow>> {
  if (variantIds.length === 0) return new Map()

  const result = (await withTimeout(
    supabase.from(ECOMMERCE_TABLES.itemVariants).select("id, weight_grams, item_id").in("id", variantIds),
    SHIPPING_RESOLUTION_TIMEOUT_MS,
    "fetchVariantWeights",
  )) as { data: Array<{ id: string; weight_grams: number | null; item_id: string }> | null; error: any }

  if (result.error) {
    throw new Error("No se pudo leer el peso de las variantes del pedido", { cause: result.error })
  }
  return new Map((result.data ?? []).map((row) => [row.id, { weightGrams: row.weight_grams, itemId: row.item_id }]))
}

async function fetchProductWeights(supabase: any, productIds: string[]): Promise<Map<string, number | null>> {
  if (productIds.length === 0) return new Map()

  const result = (await withTimeout(
    supabase.from(ECOMMERCE_TABLES.storeItems).select("id, weight_grams").in("id", productIds),
    SHIPPING_RESOLUTION_TIMEOUT_MS,
    "fetchProductWeights",
  )) as { data: Array<{ id: string; weight_grams: number | null }> | null; error: any }

  if (result.error) {
    throw new Error("No se pudo leer el peso de los productos del pedido", { cause: result.error })
  }
  return new Map((result.data ?? []).map((row) => [row.id, row.weight_grams]))
}

type ComboComponentRow = { comboId: string; productId: string; variantId: string | null; quantity: number }

// A14: a combo weighs what its components weigh (the Shopify/WooCommerce
// bundle convention) -- fetched fresh from product_combo_components rather
// than from the order's own snapshot, the same "read the catalog, not the
// client's copy of it" posture the rest of this resolver already takes.
async function fetchComboComponents(supabase: any, comboIds: string[]): Promise<ComboComponentRow[]> {
  if (comboIds.length === 0) return []

  const result = (await withTimeout(
    supabase.from(ECOMMERCE_TABLES.productComboComponents).select("combo_id, product_id, variant_id, quantity").in("combo_id", comboIds),
    SHIPPING_RESOLUTION_TIMEOUT_MS,
    "fetchComboComponents",
  )) as {
    data: Array<{ combo_id: string; product_id: string; variant_id: string | null; quantity: number }> | null
    error: any
  }

  if (result.error) {
    throw new Error("No se pudo leer los componentes de los combos del pedido", { cause: result.error })
  }
  return (result.data ?? []).map((row) => ({
    comboId: row.combo_id,
    productId: row.product_id,
    variantId: row.variant_id,
    quantity: row.quantity,
  }))
}

// D8/D22: S7 blocks ACTIVATING a weight-based zone while any product (or, since
// A14, any combo component) lacks a base weight, but an order can still contain
// one whose weight went null afterward. This throws rather than silently
// under-costing the box: resolveWeightGrams (variant override over base,
// reused rather than reimplemented) is the one place that decides which of
// the two wins for a catalog reference that DOES resolve.
async function resolveOrderWeightGrams(supabase: any, items: ShippingResolutionItem[]): Promise<number> {
  const comboIds = [...new Set(items.map((item) => item.comboId).filter((id): id is string => Boolean(id)))]
  const comboComponents = await fetchComboComponents(supabase, comboIds)

  const variantIds = [
    ...new Set([
      ...items.map((item) => item.variantId).filter((id): id is string => Boolean(id)),
      ...comboComponents.map((component) => component.variantId).filter((id): id is string => Boolean(id)),
    ]),
  ]
  const variantById = await fetchVariantWeights(supabase, variantIds)

  const productIds = [
    ...new Set([
      ...items.map((item) => item.productId).filter((id): id is string => Boolean(id)),
      ...comboComponents.map((component) => component.productId),
      ...[...variantById.values()].map((variant) => variant.itemId),
    ]),
  ]
  const productWeightById = await fetchProductWeights(supabase, productIds)

  function catalogRefWeightGrams(productId: string | null, variantId: string | null, label: string): number {
    const variant = variantId ? variantById.get(variantId) : undefined
    const baseProductId = variant?.itemId ?? productId
    const baseWeight = baseProductId ? productWeightById.get(baseProductId) ?? null : null
    const weightGrams = resolveWeightGrams(
      { weight_grams: baseWeight },
      variant ? { weight_grams: variant.weightGrams } : null,
    )

    if (weightGrams === null) {
      throw new Error(`No se pudo calcular el peso de "${label}" para cotizar el envío por peso`)
    }
    return weightGrams
  }

  return items.reduce((totalGrams, item) => {
    if (item.comboId) {
      const unitWeightGrams = comboComponents
        .filter((component) => component.comboId === item.comboId)
        .reduce(
          (sum, component) =>
            sum + catalogRefWeightGrams(component.productId, component.variantId, item.productName) * component.quantity,
          0,
        )
      return totalGrams + unitWeightGrams * item.quantity
    }

    return totalGrams + catalogRefWeightGrams(item.productId, item.variantId, item.productName) * item.quantity
  }, 0)
}
