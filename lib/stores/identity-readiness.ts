// D4's checklist as amended by A8, in one pure place so both the settings UI
// (checklist) and the checkout gate (D7: "invalid runtime identity must be
// able to fail checkout before order creation") read the exact same rule
// instead of two copies drifting apart. No IO here on purpose -- the snapshot
// is fetched by its caller.
//
// A8: logo and primary colour are REMOVED from this gate. Nothing in the
// codebase writes store_branding (no insert/update/upsert, no editor UI) --
// the columns have only ever been populated by hand in SQL, so gating
// checkout on them would leave a store unable to sell and unable to fix
// itself. Email degrades gracefully without a logo (lib/email/components.tsx
// falls back to the store name / a default colour). The gate is now exactly:
// display name, legal name, phone, commercial address, verified Reply-To,
// verified operational order mailbox.
//
// D14/F10 (plan-envios-ecommerce): phone was already unconditional here, and
// F10 leans on that instead of forking a second, mode-conditional check --
// every store is born in the `coordinate` shipping mode (D11/D17), and that
// mode's WhatsApp coordination (components/ui/floating-contact-button.tsx,
// the checkout copy in app/checkout/page.tsx) is exactly what phone was
// always guarding checkout on. The shipping settings screen
// (app/admin/settings/shipping/page.tsx) reads this SAME missingFields list
// to mark the phone pending, instead of keeping its own copy of the check.

export type StoreIdentityField =
  | "displayName"
  | "legalName"
  | "phone"
  | "commercialAddress"
  | "replyTo"
  | "orderMailbox"

export type StoreIdentitySnapshot = {
  displayName: string | null
  legalName: string | null
  phone: string | null
  commercialAddress: string | null
  replyToVerifiedAt: string | null
  orderMailboxVerifiedAt: string | null
}

export type StoreIdentityReadiness = {
  ready: boolean
  missingFields: StoreIdentityField[]
}

export function getStoreIdentityReadiness(snapshot: StoreIdentitySnapshot): StoreIdentityReadiness {
  const missingFields = STORE_IDENTITY_CHECKS.filter((check) => !check.isSatisfied(snapshot)).map(
    (check) => check.field,
  )

  return { ready: missingFields.length === 0, missingFields }
}

const STORE_IDENTITY_CHECKS: { field: StoreIdentityField; isSatisfied: (s: StoreIdentitySnapshot) => boolean }[] = [
  { field: "displayName", isSatisfied: (s) => hasText(s.displayName) },
  { field: "legalName", isSatisfied: (s) => hasText(s.legalName) },
  { field: "phone", isSatisfied: (s) => hasText(s.phone) },
  { field: "commercialAddress", isSatisfied: (s) => hasText(s.commercialAddress) },
  { field: "replyTo", isSatisfied: (s) => s.replyToVerifiedAt !== null },
  { field: "orderMailbox", isSatisfied: (s) => s.orderMailboxVerifiedAt !== null },
]

function hasText(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0
}
