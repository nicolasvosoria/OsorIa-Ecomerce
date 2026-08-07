import { createHash } from "crypto"

import type { checkoutOrderSchema } from "@/lib/checkout/schemas"
import type { z } from "zod"

type CheckoutPayload = z.infer<typeof checkoutOrderSchema>

// D28: the fingerprint covers exactly what the customer controls -- their own
// data and their cart -- never server-computed totals (repriced by
// createOrder against the catalog) or the idempotency key itself. That keeps
// a legitimate retry (network failure, double submit) fingerprinting
// identically even if a price changes between attempts, while a genuinely
// different cart or shipping address under a reused key still fingerprints
// differently and is rejected by ecommerce.create_order_with_notifications.
export function computeCheckoutPayloadFingerprint(payload: CheckoutPayload): string {
  const canonical = JSON.stringify(sortKeysDeep(payload))
  return createHash("sha256").update(canonical).digest("hex")
}

// A plain `JSON.stringify(value, Object.keys(value).sort())` only reorders
// the TOP level: the same replacer array is then applied to every nested
// object too, silently dropping any nested key (e.g. items[].product_name)
// that isn't also a top-level key. Sorting keys recursively first, with no
// replacer at stringify time, is the only way two equal-but-differently-
// ordered payloads fingerprint identically without losing nested fields.
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key])
        return sorted
      }, {})
  }

  return value
}
