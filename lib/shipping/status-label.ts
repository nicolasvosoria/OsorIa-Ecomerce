import type { ShippingResolutionStatus } from "@/lib/shipping/schemas"

// D23/A15: the one place a stored shipping_status maps to a label -- split
// by WHO is reading, so the audience is part of the call site instead of
// something a caller could silently get wrong.
//
// BUYER-facing surfaces -- the checkout quote, the success page, the order
// detail, and (S12) the confirmation email -- read shippingStatusLabelKeyForBuyer.
// It collapses "agreed" and "out_of_zone" onto the same key: to a buyer they
// mean the identical thing, nobody has priced the shipping yet and they'll
// settle it with the store directly. Distinguishing them would ask the buyer
// to care about the store's own zone configuration, which isn't their problem.
//
// STORE-facing surfaces -- the admin order detail, the orders export -- read
// shippingStatusLabelKeyForStore instead. It keeps "out_of_zone" apart from
// "agreed": to the owner, "agreed" is their own coordinate-shipping policy
// working as intended, while "out_of_zone" is a destination their zones
// don't cover -- a coverage gap only they can act on, so collapsing the two
// would hide it inside a routine message.
//
// "free" keeps its own key on every surface. "rate", and a legacy null for
// an order that predates shipping_status, return null on every surface: the
// caller renders the formatted shipping_cost instead of a fixed phrase (or,
// in the orders export's own text column, nothing at all).
export type BuyerShippingStatusLabelKey = "agreed" | "free"
export type StoreShippingStatusLabelKey = "agreed" | "outOfZone" | "free"

export function shippingStatusLabelKeyForBuyer(
  status: ShippingResolutionStatus | null | undefined,
): BuyerShippingStatusLabelKey | null {
  if (status === "free") return "free"
  if (status === "agreed" || status === "out_of_zone") return "agreed"
  return null
}

export function shippingStatusLabelKeyForStore(
  status: ShippingResolutionStatus | null | undefined,
): StoreShippingStatusLabelKey | null {
  if (status === "free") return "free"
  if (status === "agreed") return "agreed"
  if (status === "out_of_zone") return "outOfZone"
  return null
}
