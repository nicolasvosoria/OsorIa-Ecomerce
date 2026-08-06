"use server";

import { hashVerificationToken } from "@/lib/security/verification-token";
import { ECOMMERCE_FUNCTIONS } from "@/lib/supabase/contract";
import { resolveServerAuthSession } from "@/lib/supabase/server-auth-session";
import { getServiceEcommerceClient } from "@/lib/supabase/service-client";

export type FinalizeCustomerSignupResult = { ok: boolean };

// D23: the ONE place a customer profile gets created, run from app/auth/callback
// right after the browser establishes the just-confirmed session. Deliberately
// NOT reached from lib/supabase/auth-api.ts's signUp() -- that would race the
// intent against the confirmation click that hasn't happened yet. The session
// (userId/email) comes from the cookie server-auth-session.ts already reads
// for every other post-login server read, never from anything the client
// asserts about itself; ecommerce.finalize_customer_profile (the SQL migration
// this calls) is what actually enforces D23's idempotency and single-use
// guarantees. A missing or absent intentToken (a plain login, not a fresh
// signup) is a no-op success -- this only ever has work to do the first time a
// brand-new session shows up with one.
//
// Called through getServiceEcommerceClient() (service_role), never the
// session's own client: the migration grants EXECUTE on
// ecommerce.finalize_customer_profile to service_role only (verified by
// supabase/checks/verify-email-platform-contract.sql), the same posture as
// every other privileged write in this slice. p_user_id/p_email still come
// exclusively from the trusted session read above, never from anything the
// client supplies -- widening the caller's role never widens what it can
// assert about itself.
export async function finalizeCustomerSignup(intentToken: string | null): Promise<FinalizeCustomerSignupResult> {
  if (!intentToken) {
    return { ok: true };
  }

  const session = await resolveServerAuthSession();
  if (!session) {
    logFinalizeCustomerSignupFailure({ reason: "no_session" });
    return { ok: false };
  }

  const supabase = getServiceEcommerceClient();
  if (!supabase) {
    logFinalizeCustomerSignupFailure({ reason: "service_unavailable", userId: session.userId });
    return { ok: false };
  }

  const { data: userResponse } = await session.client.auth.getUser();
  const userMetadata = userResponse?.user?.user_metadata ?? {};

  const { data, error } = await supabase.rpc(ECOMMERCE_FUNCTIONS.finalizeCustomerProfile, {
    p_user_id: session.userId,
    p_email: session.email ?? "",
    p_first_name: userMetadata.first_name ?? null,
    p_last_name: userMetadata.last_name ?? null,
    p_token_hash: hashVerificationToken(intentToken),
  });

  const ok = !error && data?.ok === true;
  if (!ok) {
    logFinalizeCustomerSignupFailure({
      reason: error?.message ?? data?.reason ?? "unknown",
      userId: session.userId,
    });
  }

  return { ok };
}

// D36's structured-JSON-log convention (lib/checkout/order-notifications.ts's
// logMissingMerchantRecipient, supabase/functions/email-worker): a failure
// here must be loud in server logs even though app/auth/callback stays
// silent to the user -- a profile that failed to finalize is not something
// the customer can act on (retrying the same click re-consumes nothing new;
// the intent is already spent or was never valid), so the gap is the
// operator's to see and act on, not an interruption to a login that
// otherwise succeeded.
function logFinalizeCustomerSignupFailure(context: { reason: string; userId?: string }): void {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "finalizeCustomerSignup: failed to finalize the customer profile from a confirmed signup",
      ...context,
    }),
  );
}
