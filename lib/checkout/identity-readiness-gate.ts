const ENFORCEMENT_ENV_VAR = "CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS"

// D31: stays OFF by default so today's incomplete stores keep selling --
// flip it by setting CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS=true via
// `vercel env` once real stores have had time to complete their identity
// (lib/stores/identity-readiness.ts is the gate itself; D7: it has no SQL
// twin, so an application-level flag is what there is to gate).
export function isStoreIdentityReadinessEnforced(): boolean {
  return process.env[ENFORCEMENT_ENV_VAR] === "true"
}
