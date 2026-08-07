import { mintAuthIntent, type AuthIntentPurpose } from "@/lib/auth/auth-intents";
import { renderEmail } from "@/lib/email/render";
import { resolveEmailSender } from "@/lib/email/sender";
import type { TenantEmailBranding } from "@/lib/email/types";
import { getTenantUrl } from "@/lib/email/urls";
import { STORE_ROLE_LABELS, type StoreRoleName } from "@/lib/memberships/roles";
import { createVerificationToken } from "@/lib/security/verification-token";
import { ECOMMERCE_FUNCTIONS } from "@/lib/supabase/contract";
import { getServiceAuthAdminClient } from "@/lib/supabase/service-client";

// D22: the flag itself lives in auth.users.app_metadata (AdminUserAttributes,
// service-role only -- see GoTrueAdminApi.updateUserById) rather than
// user_metadata: only the admin API can ever write app_metadata, so a
// freshly invited session can never clear its own restriction the way it
// could a plain UserAttributes.data field. lib/auth/invited-session-gate.ts
// is the one reader.
export const INVITED_PENDING_PASSWORD_KEY = "invited_pending_password";
// D20/D22: where a native invite lands, and the one path D22's global gate
// exempts besides logout. Owned here, not by the page, because the redirect
// this module builds and the page that must be reachable are the same
// contract -- one changing without the other breaks the flow silently.
export const ACCEPT_INVITE_PATH = "/auth/accept-invite";

export type InvitePurpose = Extract<AuthIntentPurpose, "owner_invite" | "new_user_invite">;

export type AuthIdentityLookup = { exists: false } | { exists: true; userId: string };

// D20/D21's fork point. The ONLY place outside
// ecommerce.find_auth_user_id_by_email itself that may learn whether an
// email exists in auth.users -- "exists" here means "exists somewhere in
// this shared-pool project" (auth.users is shared across sibling apps),
// never "is already a user of this app", so callers must branch D20 (native
// invite) vs D21 (pending acceptance) on this alone, never on
// ecommerce.user_profiles.
export async function resolveAuthIdentityByEmail(
  service: any,
  email: string,
): Promise<AuthIdentityLookup> {
  const { data, error } = await service.rpc(ECOMMERCE_FUNCTIONS.findAuthUserIdByEmail, {
    p_email: email,
  });

  if (error) {
    throw new Error(`No se pudo resolver la identidad: ${error.message}`);
  }

  return data ? { exists: true, userId: data as string } : { exists: false };
}

export type InviteNewIdentityResult =
  | { outcome: "invited"; userId: string }
  | { outcome: "rate_limited" }
  // D24: check_and_record_send_attempt itself failed to run (transport,
  // permission) rather than reporting the limit was hit -- a distinct
  // outcome from rate_limited so an operator's structured logs can tell a
  // broken limiter apart from a busy one, WITHOUT giving the caller a new
  // signal to enumerate accounts with: every consumer maps this to the
  // exact same copy as rate_limited (stores-admin-api.ts, memberships-api.ts).
  | { outcome: "rate_limit_check_failed" }
  // The email was claimed by a concurrent request between the caller's own
  // resolveAuthIdentityByEmail check and this call -- not this module's
  // failure to compensate, since no identity was created here.
  | { outcome: "email_exists" }
  | { outcome: "error"; error: string };

// D20: mints a brand-new Auth identity via Supabase's native invite (never a
// temporary password) and immediately flags it app_metadata.invited_pending_
// password so D22's gate holds the session to setup-only routes. Callers own
// compensation (deleteInvitedIdentity) for anything that fails AFTER this
// resolves "invited" -- this function only ever compensates its OWN partial
// work (the flag write), never leaves an unflagged, unrestricted identity
// behind on a half-failure.
export async function inviteNewIdentity(
  service: any,
  input: {
    storeId: string;
    subdomain: string;
    email: string;
    purpose: InvitePurpose;
    names?: { firstName?: string; lastName?: string };
  },
): Promise<InviteNewIdentityResult> {
  const sendAttempt = await ensureInviteSendAllowed(service, input.storeId, input.purpose, input.email);
  if (sendAttempt !== "allowed") {
    return { outcome: sendAttempt };
  }

  const authAdmin = getServiceAuthAdminClient();
  if (!authAdmin) {
    return { outcome: "error", error: "Supabase no configurado" };
  }

  const intentToken = await mintAuthIntent(service, {
    storeId: input.storeId,
    purpose: input.purpose,
    email: input.email,
  });
  const redirectTo = new URL(getTenantUrl(input.subdomain, ACCEPT_INVITE_PATH));
  redirectTo.searchParams.set("intent", intentToken);

  const { data, error } = await authAdmin.auth.admin.inviteUserByEmail(input.email, {
    data: { first_name: input.names?.firstName ?? "", last_name: input.names?.lastName ?? "" },
    redirectTo: redirectTo.toString(),
  });

  if (error) {
    if (error.code === "email_exists") {
      return { outcome: "email_exists" };
    }
    return { outcome: "error", error: `No se pudo enviar la invitación: ${error.message}` };
  }

  const userId = data?.user?.id;
  if (!userId) {
    return { outcome: "error", error: "No se pudo enviar la invitación" };
  }

  const flagged = await setInvitedPendingPassword(authAdmin, userId, true);
  if (!flagged) {
    await deleteInvitedIdentity(userId);
    return { outcome: "error", error: "No se pudo preparar la invitación" };
  }

  return { outcome: "invited", userId };
}

// D25: reuses ecommerce.check_and_record_send_attempt (1/60s, 5/hour per
// store x purpose x recipient) instead of a second limiter -- same shape as
// lib/auth/prepare-auth-redirect.ts's ensureAuthSendAllowed, gating BEFORE
// any auth.users mutation so a rate-limited attempt never creates or touches
// an identity.
async function ensureInviteSendAllowed(
  service: any,
  storeId: string,
  purpose: InvitePurpose,
  email: string,
): Promise<"allowed" | "rate_limited" | "rate_limit_check_failed"> {
  const { data, error } = await service.rpc(ECOMMERCE_FUNCTIONS.checkAndRecordSendAttempt, {
    p_store_id: storeId,
    p_purpose: purpose,
    p_recipient_email: email,
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "platform-identity-invites: check_and_record_send_attempt failed, failing closed",
        storeId,
        purpose,
        error: error.message,
      }),
    );
    return "rate_limit_check_failed";
  }

  return data === true ? "allowed" : "rate_limited";
}

// Reads back the CURRENT app_metadata before writing: auth.users is a shared
// pool, so a sibling app may already carry its own keys there, and a blind
// overwrite would destroy them. AdminUserAttributes.
// app_metadata is service-role-only to write (GoTrueAdminApi.updateUserById),
// unlike user_metadata, which the client SDK can rewrite itself -- that
// asymmetry is exactly why D22 keys off this field and not the other.
async function setInvitedPendingPassword(
  authAdmin: any,
  userId: string,
  pending: boolean,
): Promise<boolean> {
  const { data: current, error: readError } = await authAdmin.auth.admin.getUserById(userId);
  if (readError) {
    return false;
  }

  const { error } = await authAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(current?.user?.app_metadata ?? {}), [INVITED_PENDING_PASSWORD_KEY]: pending },
  });

  return !error;
}

// Clears D22's restriction once the invited person sets their real password
// (app/auth/accept-invite/actions.ts). Same read-merge-write shape as the
// setter above, for the same reason.
export async function clearInvitedPendingPassword(userId: string): Promise<boolean> {
  const authAdmin = getServiceAuthAdminClient();
  if (!authAdmin) {
    return false;
  }

  return setInvitedPendingPassword(authAdmin, userId, false);
}

// D20's compensation. store_users/store_user_roles/user_profiles all chain
// back to auth.users(id) on delete cascade (see the baseline and store-
// provisioning migrations), so deleting the identity here is sufficient --
// there is no partial profile or membership row left to clean up by hand.
// Never call this for an identity resolveAuthIdentityByEmail found
// pre-existing: it must delete only what THIS invite created.
export async function deleteInvitedIdentity(userId: string): Promise<void> {
  const authAdmin = getServiceAuthAdminClient();
  if (!authAdmin) {
    console.error(`[Invites] Supabase no configurado: no se pudo revertir la identidad ${userId}`);
    return;
  }

  const { error } = await authAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(
      `[Invites] No se pudo revertir la identidad ${userId} tras un aprovisionamiento fallido:`,
      error.message,
    );
  }
}

// D20's compensation wrapper: runs `provision` (whatever profile/membership
// writes still need to happen for a freshly invited identity) and, on ANY
// failure, deletes exactly that identity before rethrowing. Two real
// callers today (createTenant and addStoreMember's own new-identity
// branches) -- never call this with a userId resolveAuthIdentityByEmail
// found pre-existing.
export async function provisionOrCompensate<T>(userId: string, provision: () => Promise<T>): Promise<T> {
  try {
    return await provision();
  } catch (error) {
    await deleteInvitedIdentity(userId);
    throw error;
  }
}

export type MintPendingMembershipInviteOutcome =
  | { outcome: "invited" }
  | { outcome: "not_authorized" }
  | { outcome: "rate_limited" }
  // D24, same shape as InviteNewIdentityResult's own rate_limit_check_failed:
  // request_membership_invite's OWN internal check_and_record_send_attempt
  // call failed to run (not a false return -- see the migration's exception
  // handler) rather than reporting the limit was hit. Every consumer maps
  // this to the exact same copy as rate_limited (stores-admin-api.ts).
  | { outcome: "rate_limit_check_failed" }
  | { outcome: "invalid_role" }
  | { outcome: "error"; error: string };

// D21: the ONLY path that ever queues a membership-acceptance email. Renders
// in TS (SQL can't render React -- D13) and hands
// ecommerce.request_membership_invite everything it needs to enqueue an
// immutable outbox snapshot, mint the pending invite and record the D25
// attempt atomically -- same shape as
// app/admin/actions/store-identity.ts's requestMailboxVerification.
export async function mintPendingMembershipInvite(
  service: any,
  input: {
    actorUserId: string;
    storeId: string;
    intendedUserId: string;
    email: string;
    roleName: StoreRoleName;
    branding: TenantEmailBranding;
  },
): Promise<MintPendingMembershipInviteOutcome> {
  const { token, tokenHash } = createVerificationToken();
  const sender = resolveEmailSender("membership-acceptance", input.branding.displayName, null);
  const rendered = await renderEmail({
    kind: "membership-acceptance",
    branding: input.branding,
    data: {
      recipientName: input.email.split("@")[0],
      membershipName: STORE_ROLE_LABELS[input.roleName],
      actionPath: `/auth/accept-membership?token=${token}`,
    },
  });

  const { data, error } = await service.rpc(ECOMMERCE_FUNCTIONS.requestMembershipInvite, {
    p_actor_user_id: input.actorUserId,
    p_store_id: input.storeId,
    p_intended_user_id: input.intendedUserId,
    p_email: input.email,
    p_role_name: input.roleName,
    p_token_hash: tokenHash,
    p_email_from: sender.from,
    p_email_subject: rendered.subject,
    p_email_html: rendered.html,
    p_email_text: rendered.text,
    p_idempotency_key: `membership-invite:${input.storeId}:${input.intendedUserId}:${tokenHash}`,
  });

  if (error) {
    return { outcome: "error", error: error.message };
  }
  if (!data?.ok) {
    if (data?.reason === "rate_limit_check_failed") {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "platform-identity-invites: request_membership_invite's check_and_record_send_attempt failed, failing closed",
          storeId: input.storeId,
          intendedUserId: input.intendedUserId,
          error: data?.detail,
        }),
      );
    }
    return toPendingInviteOutcome(data?.reason);
  }

  return { outcome: "invited" };
}

const PENDING_INVITE_REJECTION_REASONS = [
  "not_authorized",
  "rate_limited",
  "rate_limit_check_failed",
  "invalid_role",
] as const;

function toPendingInviteOutcome(reason: unknown): MintPendingMembershipInviteOutcome {
  const known = PENDING_INVITE_REJECTION_REASONS.find((candidate) => candidate === reason);
  return known ? { outcome: known } : { outcome: "error", error: "No se pudo enviar la invitación" };
}
