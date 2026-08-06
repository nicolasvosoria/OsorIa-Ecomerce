"use server";

import { mintAuthIntent } from "@/lib/auth/auth-intents";
import { getTenantUrl } from "@/lib/email/urls";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { ECOMMERCE_FUNCTIONS } from "@/lib/supabase/contract";
import { getServiceEcommerceClient } from "@/lib/supabase/service-client";
import { loadStoreIdentity } from "@/lib/supabase/store-identity-api";
import { getRuntimeStoreId } from "@/lib/utils/store";

export type AuthSendPurpose = "signup" | "recovery";

export type PrepareAuthRedirectResult =
  | { ok: true; redirectTo: string }
  | { ok: false; reason: "turnstile_failed" | "rate_limited" | "store_unresolved" | "service_unavailable" };

// The one server hop signUp/resetPassword (lib/supabase/auth-api.ts) make
// before ever calling GoTrue: D26's Turnstile gate, D25's reused rate limit,
// and D23's intent mint, all against the store resolved HERE -- in the same
// request the customer is acting on, via the same trusted primitive D8 names
// (getRuntimeStoreId(), already how signup_store_id has always been resolved).
// The link the app builds afterwards uses lib/email/urls.ts's persisted
// subdomain (D8), never window.location or a raw header value: exactly what
// supabase/functions/auth-email-hook later reads back out of `redirect_to` to
// resolve which store an Auth email renders with (lib/auth/auth-intents.ts).
export async function prepareAuthRedirect(input: {
  email: string;
  purpose: AuthSendPurpose;
  path: string;
  turnstileToken: string | null;
}): Promise<PrepareAuthRedirectResult> {
  const turnstile = await verifyTurnstile(input.turnstileToken);
  if (!turnstile.ok) {
    return { ok: false, reason: "turnstile_failed" };
  }

  const storeId = await getRuntimeStoreId();
  if (!storeId) {
    return { ok: false, reason: "store_unresolved" };
  }

  const supabase = getServiceEcommerceClient();
  if (!supabase) {
    return { ok: false, reason: "service_unavailable" };
  }

  const allowed = await ensureAuthSendAllowed(supabase, storeId, input.purpose, input.email);
  if (!allowed) {
    return { ok: false, reason: "rate_limited" };
  }

  const identity = await loadStoreIdentity(supabase, storeId);
  const token = await mintAuthIntent(supabase, { storeId, purpose: input.purpose, email: input.email });

  const redirectTo = new URL(getTenantUrl(identity.subdomain, input.path));
  redirectTo.searchParams.set("intent", token);

  return { ok: true, redirectTo: redirectTo.toString() };
}

// D25: reuses ecommerce.check_and_record_send_attempt (1/60s, 5/hour per
// store x purpose x recipient) instead of a second limiter -- inlined here
// rather than its own module since prepareAuthRedirect is its one and only
// caller. `purpose` is namespaced with an `auth:` prefix so an auth send
// attempt can never collide with a mailbox-verification purpose sharing the
// same underlying table (D25's migration comment: "deliberately
// purpose-generic so invite sends can reuse the same table" -- lib/auth/
// platform-identity-invites.ts is that reuse).
async function ensureAuthSendAllowed(
  supabase: any,
  storeId: string,
  purpose: AuthSendPurpose,
  email: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc(ECOMMERCE_FUNCTIONS.checkAndRecordSendAttempt, {
    p_store_id: storeId,
    p_purpose: `auth:${purpose}`,
    p_recipient_email: email,
  });

  return !error && data === true;
}
