// D4's checklist, in one pure place so both the settings UI (checklist) and a
// later checkout gate (D7: "invalid runtime identity must be able to fail
// checkout before order creation") read the exact same rule instead of two
// copies drifting apart. No IO here on purpose -- the snapshot is fetched by
// its caller.

export type StoreIdentityField =
  | "displayName"
  | "legalName"
  | "logo"
  | "primaryColor"
  | "phone"
  | "commercialAddress"
  | "replyTo"
  | "orderMailbox"

export type StoreIdentitySnapshot = {
  displayName: string | null
  legalName: string | null
  logoUrl: string | null
  primaryColor: string | null
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
  { field: "logo", isSatisfied: (s) => hasText(s.logoUrl) },
  { field: "primaryColor", isSatisfied: (s) => hasText(s.primaryColor) },
  { field: "phone", isSatisfied: (s) => hasText(s.phone) },
  { field: "commercialAddress", isSatisfied: (s) => hasText(s.commercialAddress) },
  { field: "replyTo", isSatisfied: (s) => s.replyToVerifiedAt !== null },
  { field: "orderMailbox", isSatisfied: (s) => s.orderMailboxVerifiedAt !== null },
]

function hasText(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0
}
