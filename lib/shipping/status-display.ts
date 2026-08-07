import { formatPrice } from "@/lib/commerce/utils"
import type { Translations } from "@/lib/i18n/translations"
import type { ShippingResolutionStatus } from "@/lib/shipping/resolver"

// D23: every surface renders shipping from the STATUS, never back-computes
// from the amount -- a $0 must never mean two different things (agreed's
// "still to negotiate" and free's "the ladder's own top rung" both cost 0).
// The checkout preview (app/checkout/page.tsx) is the first caller; an order
// that already exists carries this same status on its own row (shipping_status)
// and can render it through this exact function, so the two screens can't
// drift into different words for the same status.
export type ShippingLabelTranslations = Pick<
  Translations["checkout"],
  "shippingConfirmedByStore" | "shippingOutOfZone" | "shippingFree"
>

export function formatShippingResolutionLabel(
  status: ShippingResolutionStatus,
  amount: number,
  currencyCode: string,
  t: ShippingLabelTranslations,
): string {
  if (status === "agreed") return t.shippingConfirmedByStore
  if (status === "out_of_zone") return t.shippingOutOfZone
  if (status === "free") return t.shippingFree
  return formatPrice(amount, currencyCode)
}
