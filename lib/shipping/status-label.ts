import type { ShippingResolutionStatus } from "@/lib/shipping/resolver"

// D23/A3: the one place a stored shipping_status maps to which
// lib/i18n/translations.ts key (orders.shippingStatusLabels) names its
// label. Every surface that renders a shipping line -- the success page,
// the order detail, the admin order page, the orders export -- reads
// through this instead of keeping its own status-to-label mapping, so a
// zero can only ever mean what its status says it means (D23's whole
// point: "a zero must never mean two things"). "out_of_zone" collapses
// onto the same label as "agreed": both mean the system priced it at
// nothing and the real cost gets settled directly with the store (see
// store_shipping_settings.unmatched_destination_action's own "allow it
// and coordinate shipping afterward" copy) -- only "free" is a deliberate
// zero. "rate", and a legacy null for orders that predate shipping_status,
// return null: the caller renders the formatted shipping_cost instead of
// a fixed phrase.
export type ShippingStatusLabelKey = "agreed" | "free"

export function shippingStatusLabelKey(
  status: ShippingResolutionStatus | null | undefined,
): ShippingStatusLabelKey | null {
  if (status === "free") return "free"
  if (status === "agreed" || status === "out_of_zone") return "agreed"
  return null
}
