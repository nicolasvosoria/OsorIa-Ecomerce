import Link from "next/link"
import { CircleDashed } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { translations } from "@/lib/i18n/translations"

const copy = translations.es.shipping

export type ShippingContactPendingReason =
  // No phone saved at all -- reads lib/stores/identity-readiness.ts's
  // missingFields, the same gate checkout already enforces.
  | "missing"
  // A9: a phone IS saved, but lib/stores/whatsapp-contact.ts's
  // buildWhatsAppLink can't turn it into a working international link (wrong
  // digit count, an extension, etc.) -- the store owner needs to see this,
  // the same way a missing phone is surfaced, not silently swallowed.
  | "invalid"

const NOTICE_COPY: Record<ShippingContactPendingReason, { title: string; description: string; cta: string }> = {
  missing: {
    title: copy.contactPhonePendingTitle,
    description: copy.contactPhonePendingDescription,
    cta: copy.contactPhonePendingCta,
  },
  invalid: {
    title: copy.contactPhoneInvalidTitle,
    description: copy.contactPhoneInvalidDescription,
    cta: copy.contactPhoneInvalidCta,
  },
}

// D14/F10/A9: the coordinate mode's WhatsApp button and checkout copy both
// need a usable phone. No warning/amber token exists in the design system,
// so this stays the neutral Alert variant, same as the identity panel's own
// "missing" indicator (app/admin/settings/components/store-identity-panel.tsx).
export function ShippingContactPendingNotice({ reason }: { reason: ShippingContactPendingReason }) {
  const text = NOTICE_COPY[reason]

  return (
    <Alert>
      <CircleDashed aria-hidden />
      <AlertTitle>{text.title}</AlertTitle>
      <AlertDescription>
        <p>
          {text.description}{" "}
          <Link href="/admin/settings" className="font-medium underline underline-offset-4">
            {text.cta}
          </Link>
        </p>
      </AlertDescription>
    </Alert>
  )
}
