import { z } from "zod"

import { translations } from "@/lib/i18n/translations"

// D23/A3: how an order's shipping cost was arrived at, stored alongside the
// amount so a $0 line never means two different things -- coordinate's "we
// still have to agree on it" and a ladder's genuine free-shipping rung both
// cost 0.
export type ShippingResolutionStatus = "agreed" | "rate" | "free" | "out_of_zone"

export type ShippingDestination = {
  departmentCode: string
  municipalityCode: string
}

// D24: the department/municipality pair of the five-field structured
// destination the address book (lib/account/schemas.ts) and checkout
// (lib/checkout/schemas.ts) both collect, via the same chained picker (D28)
// -- one rule and one message each, sourced from the same
// translations.es.checkout copy the picker itself renders, reused under
// whatever key name each schema needs instead of each keeping its own
// hardcoded repeat of that wording.
const REQUIRED_DEPARTMENT_MESSAGE = translations.es.checkout.selectDepartment
const REQUIRED_MUNICIPALITY_MESSAGE = translations.es.checkout.selectMunicipality

export const requiredDepartmentField = z.string().trim().min(1, REQUIRED_DEPARTMENT_MESSAGE)
export const requiredMunicipalityField = z.string().trim().min(1, REQUIRED_MUNICIPALITY_MESSAGE)

// A3: stored values are frozen English identifiers -- Spanish only shows up in
// the label the UI renders (lib/i18n/translations.ts).
export const SHIPPING_MODES = ["coordinate", "own_rates", "auto_quote"] as const

export type ShippingMode = (typeof SHIPPING_MODES)[number]

// D11: auto_quote has no strategy behind it yet, so the admin selector never
// offers it -- an owner must not be able to pick a mode with nothing behind it.
export const SELECTABLE_SHIPPING_MODES = ["coordinate", "own_rates"] as const satisfies readonly ShippingMode[]

export type SelectableShippingMode = (typeof SELECTABLE_SHIPPING_MODES)[number]

export const shippingModeFormSchema = z.object({
  mode: z.enum(SELECTABLE_SHIPPING_MODES),
})

export type ShippingModeFormValues = z.infer<typeof shippingModeFormSchema>

// A stored mode can be auto_quote (D11's modeled-but-not-yet-offered value)
// even though nothing writes it today, so the form -- which only knows the
// two selectable modes -- falls back to the born default rather than crash.
export function toSelectableShippingMode(mode: ShippingMode): SelectableShippingMode {
  return (SELECTABLE_SHIPPING_MODES as readonly ShippingMode[]).includes(mode)
    ? (mode as SelectableShippingMode)
    : "coordinate"
}

// The one place a stored mode maps to which lib/i18n/translations.ts key names
// its label (D31) -- both the form's Select and the settings summary read
// through this instead of each keeping its own mode-to-label mapping.
export function shippingModeLabelKey(mode: ShippingMode): "modeCoordinate" | "modeOwnRates" {
  return toSelectableShippingMode(mode) === "own_rates" ? "modeOwnRates" : "modeCoordinate"
}

// D7: what a checkout quote does when a destination matches no configured
// zone. Modeled by store_shipping_settings since wave 1; this is the slice
// that finally gives it a UI, because "no matching zone" only means
// something once zones exist.
export const UNMATCHED_DESTINATION_ACTIONS = ["block", "allow_with_coordination"] as const

export type UnmatchedDestinationAction = (typeof UNMATCHED_DESTINATION_ACTIONS)[number]

export const unmatchedDestinationActionFormSchema = z.object({
  unmatchedDestinationAction: z.enum(UNMATCHED_DESTINATION_ACTIONS),
})

// D6: a zone's rate ladder basis. Chosen once per zone -- every row of its
// ladder shares it (D5: "one rate ladder per zone").
export const SHIPPING_RATE_BASES = ["flat", "order_value", "weight"] as const

export type ShippingRateBasis = (typeof SHIPPING_RATE_BASES)[number]

// Same one-mapping-many-readers shape as shippingModeLabelKey above: the
// zone editor's basis Select and the zones table's basis column both read
// through this instead of each keeping its own basis-to-label mapping.
export function shippingRateBasisLabelKey(
  basis: ShippingRateBasis,
): "basisFlat" | "basisOrderValue" | "basisWeight" {
  if (basis === "order_value") return "basisOrderValue"
  if (basis === "weight") return "basisWeight"
  return "basisFlat"
}

const REQUIRED_ZONE_NAME_MESSAGE = "El nombre de la zona es requerido"
const MIN_ONE_DESTINATION_MESSAGE = "Agrega al menos un destino a la zona"
const DUPLICATE_DESTINATION_MESSAGE = "Hay destinos repetidos en la zona"
const MIN_ONE_RANGE_MESSAGE = "Agrega al menos un rango de tarifa"
const NEGATIVE_AMOUNT_MESSAGE = "El monto no puede ser negativo"
const NEGATIVE_RANGE_BOUND_MESSAGE = "El valor no puede ser negativo"
const RANGE_TO_BEFORE_FROM_MESSAGE = "El límite superior debe ser mayor al inferior"

function isNonNegativeNumber(value: string): boolean {
  const parsed = Number(value)
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0
}

// Numeric fields stay strings end to end (lib/products/schemas.ts's own
// requiredWeightGrams/positiveBasePrice precedent) -- parsed to numbers only
// at the API boundary, never coerced inside the schema.
const nonNegativeAmount = z.string().refine(isNonNegativeNumber, NEGATIVE_AMOUNT_MESSAGE)
const nonNegativeRangeBound = z.string().refine(isNonNegativeNumber, NEGATIVE_RANGE_BOUND_MESSAGE)

const rateRangeRowSchema = z
  .object({
    from: nonNegativeRangeBound,
    // Vacío = sin límite superior (infinito): solo tiene sentido en el
    // último escalón de la escalera; findShippingLadderGaps es quien lo exige.
    to: z.string(),
    amount: nonNegativeAmount,
  })
  .refine(
    (row) => row.to.trim() === "" || (isNonNegativeNumber(row.to) && Number(row.to) > Number(row.from)),
    { message: RANGE_TO_BEFORE_FROM_MESSAGE, path: ["to"] },
  )

export type ShippingRateRangeRowValues = z.infer<typeof rateRangeRowSchema>

// Same bounds rateRangeRowSchema validates, without amount's own check:
// parseShippingLadderRangeBounds (near findShippingLadderGaps below) is the
// only caller, and it exists precisely so a still-blank Monto can't hide a
// gap or overlap that's already visible from from/to alone.
const rateRangeBoundsRowSchema = z
  .object({
    from: nonNegativeRangeBound,
    to: z.string(),
  })
  .refine(
    (row) => row.to.trim() === "" || (isNonNegativeNumber(row.to) && Number(row.to) > Number(row.from)),
    { message: RANGE_TO_BEFORE_FROM_MESSAGE, path: ["to"] },
  )

const flatRateLadderSchema = z.object({
  basis: z.literal("flat"),
  amount: nonNegativeAmount,
})

const orderValueRateLadderSchema = z.object({
  basis: z.literal("order_value"),
  ranges: z.array(rateRangeRowSchema).min(1, MIN_ONE_RANGE_MESSAGE),
})

const weightRateLadderSchema = z.object({
  basis: z.literal("weight"),
  ranges: z.array(rateRangeRowSchema).min(1, MIN_ONE_RANGE_MESSAGE),
})

// D6's three storage shapes (flat vs. ranged) as a discriminated union, not
// one row shape with unused nullable fields -- an illegal state (a flat rate
// carrying bounds, or a ranged rate missing them) is unrepresentable rather
// than merely unchecked.
export const shippingRateLadderSchema = z.discriminatedUnion("basis", [
  flatRateLadderSchema,
  orderValueRateLadderSchema,
  weightRateLadderSchema,
])

export type ShippingRateLadder = z.infer<typeof shippingRateLadderSchema>

// The editor form keeps `amount` and `ranges` around together regardless of
// the chosen basis -- useFieldArray needs a fixed `ranges` path to exist,
// and switching `basis` shouldn't discard whichever one the owner isn't
// looking at. toRateLadderPayload narrows this down to the real ladder
// shape only at the validation boundary (submit, and the server action).
export type ShippingRateLadderFormValues = {
  basis: ShippingRateBasis
  amount: string
  ranges: ShippingRateRangeRowValues[]
}

export function toRateLadderPayload(values: ShippingRateLadderFormValues): unknown {
  if (values.basis === "flat") {
    return { basis: "flat", amount: values.amount }
  }
  return { basis: values.basis, ranges: values.ranges }
}

const destinationSchema = z.object({
  departmentCode: z.string().min(1),
  municipalityCode: z.string().nullable(),
})

export type ShippingZoneDestinationInput = z.infer<typeof destinationSchema>

// The one place a (departmentCode, municipalityCode) pair becomes a
// comparison key -- the zone editor uses it to spot a destination already in
// the list, this schema's own duplicate-destination refine below uses it too.
export function destinationKey(destination: ShippingZoneDestinationInput): string {
  return `${destination.departmentCode}:${destination.municipalityCode ?? ""}`
}

// Deliberately permissive (no refine, no basis-conditional requirement):
// this is here only so the RHF form's inferred type has a `rateLadder` key
// at all, matching react-hook-form + zodResolver's usual shape (one schema,
// one full set of form values -- lib/combos/schemas.ts's comboSchema is the
// local precedent). The real, basis-conditional validation is a SEPARATE
// check (toRateLadderPayload + shippingRateLadderSchema +
// findShippingLadderGaps) run by hand at submit, never by this resolver --
// if the strict rateRangeRowSchema lived here instead, a flat zone's inert
// placeholder range row (basis=flat never shows or needs it) would fail
// validation on a field the owner can't even see.
const looseRateLadderFieldSchema = z.object({
  basis: z.enum(SHIPPING_RATE_BASES),
  amount: z.string(),
  ranges: z.array(z.object({ from: z.string(), to: z.string(), amount: z.string() })),
})

// Shared by both schemas below: the client form's own name/destinations
// rules, factored out once instead of duplicated between the loose
// (RHF-resolver) shape and the strict wire-payload shape.
const zoneNameFieldSchema = z.string().trim().min(1, REQUIRED_ZONE_NAME_MESSAGE)

const zoneDestinationsFieldSchema = z
  .array(destinationSchema)
  .min(1, MIN_ONE_DESTINATION_MESSAGE)
  .refine(
    (destinations) => new Set(destinations.map(destinationKey)).size === destinations.length,
    DUPLICATE_DESTINATION_MESSAGE,
  )

export const shippingZoneFormSchema = z.object({
  name: zoneNameFieldSchema,
  destinations: zoneDestinationsFieldSchema,
  rateLadder: looseRateLadderFieldSchema,
})

export type ShippingZoneFormValues = z.infer<typeof shippingZoneFormSchema>

// Alias used by the editor's components: same shape, names the whole-form
// value rather than the schema it happens to come from.
export type ZoneEditorFormValues = ShippingZoneFormValues

// The wire payload saveShippingZoneAction actually receives: name and
// destinations share the client form's own rules, but rateLadder is the
// STRICT discriminated union (shippingRateLadderSchema) -- never the form's
// loose, placeholder-carrying shape above. One schema for what crosses the
// client -> server boundary, so the two sides can't silently disagree about
// the same field the way a separate form-side schema and a separate,
// hand-parsed action-side rateLadder once did (every save failed
// rateLadder.ranges/amount "Required" and reported only the generic
// INVALID_INPUT).
export const shippingZoneActionSchema = z.object({
  name: zoneNameFieldSchema,
  destinations: zoneDestinationsFieldSchema,
  rateLadder: shippingRateLadderSchema,
})

export type ShippingLadderGapIssue = {
  code: "not_starting_at_zero" | "gap" | "overlap" | "not_open_ended"
  message: string
}

const LADDER_MUST_START_AT_ZERO_MESSAGE = "El primer rango de la escalera debe empezar en 0"
const LADDER_GAP_MESSAGE = "La escalera de tarifas tiene un vacío entre dos rangos"
const LADDER_OVERLAP_MESSAGE = "La escalera de tarifas tiene rangos que se superponen"
const LADDER_MUST_END_OPEN_MESSAGE = "El último rango de la escalera debe quedar sin límite superior"

// Everything findShippingLadderGaps below actually reads: two bounds per
// range, never the amount. ShippingRateLadder (amount included) satisfies
// this structurally, so the strict save-path check keeps passing it as-is --
// but this narrower shape is also what parseShippingLadderRangeBounds below
// produces, so the live gap indicator (rate-ladder-field.tsx) can ask "are
// the BOUNDS complete" without first having to answer "is the amount too",
// which a still-blank Monto would otherwise fail.
export type ShippingRateLadderBounds =
  | { basis: "flat" }
  | { basis: "order_value" | "weight"; ranges: { from: string; to: string }[] }

// D6: "a zone's ladder MUST cover 0 to infinity with no gaps". This is a
// cross-row invariant a CHECK constraint cannot express, so -- following
// lib/home-discount-popup.ts's validateHomeDiscountPopupAdminStatus, the
// only local precedent for a save-gating validator that lives outside zod --
// it's a plain function over the already-shape-validated ladder, called both
// by the editor for a live indicator and by the save path to block an
// incomplete ladder (D6), not merely warn about it.
export function findShippingLadderGaps(ladder: ShippingRateLadderBounds): ShippingLadderGapIssue[] {
  if (ladder.basis === "flat") {
    return []
  }

  const ranges = [...ladder.ranges]
    .map((range) => ({
      from: Number(range.from),
      to: range.to.trim() === "" ? null : Number(range.to),
    }))
    .sort((a, b) => a.from - b.from)

  const issues: ShippingLadderGapIssue[] = []

  if (ranges[0].from !== 0) {
    issues.push({ code: "not_starting_at_zero", message: LADDER_MUST_START_AT_ZERO_MESSAGE })
  }

  for (let index = 0; index < ranges.length - 1; index += 1) {
    const current = ranges[index]
    const next = ranges[index + 1]

    if (current.to === null) {
      issues.push({ code: "overlap", message: LADDER_OVERLAP_MESSAGE })
      continue
    }
    if (current.to < next.from) {
      issues.push({ code: "gap", message: LADDER_GAP_MESSAGE })
    } else if (current.to > next.from) {
      issues.push({ code: "overlap", message: LADDER_OVERLAP_MESSAGE })
    }
  }

  if (ranges[ranges.length - 1].to !== null) {
    issues.push({ code: "not_open_ended", message: LADDER_MUST_END_OPEN_MESSAGE })
  }

  return issues
}

// The live indicator's own entry point: validates only what
// findShippingLadderGaps needs (from/to), so a range row whose Monto is still
// blank -- or not yet a valid number -- doesn't take the whole ladder's gap
// check down with it while an owner is mid-edit.
export function parseShippingLadderRangeBounds(
  ranges: { from: string; to: string }[],
): { from: string; to: string }[] | null {
  const parsed = z.array(rateRangeBoundsRowSchema).min(1, MIN_ONE_RANGE_MESSAGE).safeParse(ranges)
  return parsed.success ? parsed.data : null
}
