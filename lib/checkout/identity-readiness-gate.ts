const ENFORCEMENT_ENV_VAR = "CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS"

// D31: the gate itself (lib/stores/identity-readiness.ts) and its wiring into
// checkout (lib/checkout/order-writer.ts) both ship in this slice, but stay
// OFF by default so today's incomplete stores keep selling. This mirrors how
// 20260805000400_ecommerce_email_worker_provisioning.sql already stages the
// email worker's cron jobs -- authored now, switched on later -- translated
// to an application-level flag because this check is pure TS (D7:
// getStoreIdentityReadiness has no SQL twin) with no migration to gate it.
// Slice 7 flips it by setting CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS=true
// via `vercel env` once real stores have had time to complete their identity.
export function isStoreIdentityReadinessEnforced(): boolean {
  return process.env[ENFORCEMENT_ENV_VAR] === "true"
}
