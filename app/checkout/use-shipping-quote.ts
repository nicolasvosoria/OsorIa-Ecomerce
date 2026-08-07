"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { getCheckoutShippingQuote } from "@/app/checkout/actions"
import type { CartItem } from "@/contexts/cart-context"
import type { ShippingResolutionItem } from "@/lib/shipping/resolver"
import type { ShippingDestination, ShippingResolutionStatus } from "@/lib/shipping/schemas"

// D23: the live quote's own vocabulary of states -- "resolved" carries one of
// the four resolution statuses (lib/shipping/schemas.ts), the rest are this
// preview's own transitional/failure states, never a status the resolver
// itself would return. "idle"/"loading" are never stored -- see `quoted`
// below for why only a settled outcome is state.
type ShippingQuoteOutcome =
  | { kind: "resolved"; status: ShippingResolutionStatus; amount: number }
  | { kind: "blocked" }
  | { kind: "failed" }

export type ShippingQuoteState = { kind: "idle" } | { kind: "loading" } | ShippingQuoteOutcome

export type ShippingQuoteResult = {
  quote: ShippingQuoteState
  // D28/D25: the exact string the quote itself keys off, exposed so
  // app/checkout/page.tsx's idempotency key regenerates in lockstep with the
  // quote instead of keeping a second, driftable copy of the same rule.
  fingerprint: string | null
  // Re-fires the quote for the SAME destination/cart -- the one recovery a
  // "failed" outcome needs (D25 already re-quotes for free the moment either
  // one actually changes; re-picking the identical municipality is bailed
  // out by app/checkout/page.tsx's own identity check, so a failed request
  // needs its own way back in, same as shipping-location-picker.tsx's own
  // retry for its two chained selects).
  retry: () => void
}

// D25: re-quotes on the only two things that change the price -- the
// destination or the cart -- and on nothing else (typing a name, say, never
// fires this). See `quoted` below for how a stale response is kept from ever
// surfacing as the current answer.
export function useShippingQuote(
  destination: ShippingDestination | null,
  items: CartItem[],
  subtotal: number,
): ShippingQuoteResult {
  // The settled outcome of the most recent quote request, tagged with the
  // fingerprint of the request it answers. A stale response for an old
  // destination/cart must never surface as the current answer -- two
  // mechanisms enforce that together: the effect's own `cancelled` flag
  // below (React runs its cleanup before the next run, same guard
  // getCheckoutPrefill/getCheckoutStoreContactPhone use in
  // app/checkout/page.tsx) stops a late .then/.catch from calling setQuoted
  // at all, and even if one somehow raced past that, `quote` below only
  // trusts an outcome whose fingerprint still matches the CURRENT
  // `requestFingerprint` -- an in-flight request for an old destination can
  // only ever produce a fingerprint that no longer matches by the time it
  // resolves. `attempt` is tagged the same way, so a retry of the SAME
  // fingerprint (nothing about the destination/cart changed) still reads as
  // "loading" instead of instantly re-showing the stale failed outcome.
  const [quoted, setQuoted] = useState<{
    fingerprint: string
    attempt: number
    outcome: ShippingQuoteOutcome
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((count) => count + 1), [])

  // A primitive fingerprint of what the resolver actually prices (D25: the
  // idempotency key and this quote both key off destination-or-cart, never
  // the cart array's own reference identity, which cart-context can hand
  // back as a new object every render even when nothing in it changed).
  const cartFingerprint = items
    .map((item) => `${item.id}:${item.variantId ?? ""}:${item.comboId ?? ""}:${item.quantity}`)
    .join("|")
  const shippingQuoteItems = useMemo(
    () => toShippingResolutionItems(items),
    // cartFingerprint IS items' content identity -- keying off it instead of
    // the array itself keeps this stable across renders where the cart
    // didn't actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cartFingerprint],
  )
  const requestFingerprint = destination
    ? buildShippingQuoteFingerprint(destination, cartFingerprint, subtotal)
    : null

  useEffect(() => {
    if (!destination || !requestFingerprint) return
    const fingerprint = requestFingerprint
    const currentAttempt = attempt

    let cancelled = false
    getCheckoutShippingQuote({ destination, subtotal, items: shippingQuoteItems })
      .then((result) => {
        if (cancelled) return
        setQuoted({
          fingerprint,
          attempt: currentAttempt,
          outcome: result.ok
            ? { kind: "resolved", status: result.resolution.status, amount: result.resolution.amount }
            : { kind: result.blocked ? "blocked" : "failed" },
        })
      })
      .catch(() => {
        if (cancelled) return
        setQuoted({ fingerprint, attempt: currentAttempt, outcome: { kind: "failed" } })
      })

    return () => {
      cancelled = true
    }
  }, [destination, requestFingerprint, subtotal, shippingQuoteItems, attempt])

  // Derived, never stored: "idle" (no destination yet) and "loading" (a
  // request is in flight for the CURRENT fingerprint/attempt) are both
  // computed at render time by comparing fingerprints, never set from the
  // effect above.
  const quote: ShippingQuoteState = !destination
    ? { kind: "idle" }
    : quoted?.fingerprint === requestFingerprint && quoted?.attempt === attempt
      ? quoted.outcome
      : { kind: "loading" }

  return { quote, fingerprint: requestFingerprint, retry }
}

// Same shape the resolver prices (lib/shipping/resolver.ts's ShippingResolutionItem):
// a combo item carries no product/variant of its own, a catalog item carries
// no combo -- mirrors app/checkout/page.tsx's own buildOrderItemsFromCart
// product_id fallback, this is the preview's read of the same cart, not the
// order's.
function toShippingResolutionItems(items: CartItem[]): ShippingResolutionItem[] {
  return items.map((item) => ({
    productId: item.itemKind === "combo" ? null : item.productId || (typeof item.id === "string" ? item.id : null),
    variantId: item.itemKind === "combo" ? null : item.variantId ?? null,
    comboId: item.itemKind === "combo" ? item.comboId ?? null : null,
    productName: item.name,
    quantity: item.quantity,
  }))
}

// One string identifying "this destination against this cart" -- shared by
// the quoting effect (is this response still the answer to the CURRENT
// question?) and app/checkout/page.tsx's idempotency key (has anything
// price-affecting changed since the last attempt?) so the two can't drift
// into checking two different things.
function buildShippingQuoteFingerprint(
  destination: ShippingDestination,
  cartFingerprint: string,
  subtotal: number,
): string {
  return `${destination.departmentCode}:${destination.municipalityCode}:${cartFingerprint}:${subtotal}`
}
