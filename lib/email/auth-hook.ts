// Relative imports with explicit extensions, same as every other file in
// this directory reused by a Deno function (D15) -- see lib/email/render.tsx
// and its own siblings: Deno's module graph requires a fully specified
// specifier, and the `@/...` path alias only exists inside this project's
// own tsconfig/webpack resolution, not Deno's.
import { renderEmail } from "./render.tsx";
import { resolveEmailSender } from "./sender.ts";
import type { EmailTemplateInput, EmailTemplateKind, TenantEmailBranding } from "./types.ts";

// D15/D11: maps GoTrue's `email_data.email_action_type` to this app's four-
// kind Auth catalog. "invite" resolves to owner-invite/new-user-invite only
// once an auth_intents row with that purpose exists to read (lib/auth/
// platform-identity-invites.ts mints those; this file never does) -- see
// resolveAuthEventKind. Every other action_type this project's Supabase Auth
// can still emit (magiclink, email_change_current/new, reauthentication) has
// no catalog entry: this app never triggers them, so a request for one is a
// graceful no-op, never an error that could block a legitimate GoTrue action
// (D15's five-second/never-fail-the-user posture).
//
// "password_changed_notification" is not in Supabase's publicly documented
// action-type list; it was confirmed empirically against the local GoTrue
// v2.194.0 binary (the string constant next to the
// GOTRUE_MAILER_NOTIFICATIONS_PASSWORD_CHANGED_ENABLED flag supabase/config.toml
// turns on) rather than guessed.

export type AuthHookUser = {
  id: string;
  email: string;
  user_metadata?: { first_name?: string; last_name?: string };
};

export type AuthHookEmailData = {
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
};

export type AuthHookPayload = {
  user: AuthHookUser;
  email_data: AuthHookEmailData;
};

export type EnqueueAuthEmailRow = {
  storeId: string;
  templateKind: EmailTemplateKind;
  recipientEmail: string;
  idempotencyKey: string;
  fromAddress: string;
  replyToAddress: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
};

export type AuthHookDeps = {
  peekAuthIntent: (token: string) => Promise<{ storeId: string; purpose: string } | null>;
  loadStoreIdentity: (storeId: string) => Promise<TenantEmailBranding>;
  loadProfileHomeStore: (userId: string) => Promise<string | null>;
  enqueueEmail: (row: EnqueueAuthEmailRow) => Promise<void>;
};

export type AuthHookOutcome =
  | { enqueued: true }
  | { enqueued: false; reason: "unhandled_action_type" | "store_unresolved" };

// D15's whole hook, dependency-injected like lib/email/outbox-worker.ts so
// Vitest can prove the wiring (D41) with a mocked enqueueEmail and never
// reach Resend -- the worker (lib/email/outbox-worker.ts,
// supabase/functions/email-worker) is the only thing that ever calls Resend.
// Rendering (renderEmail) is the only "slow" step here and is itself
// sub-100ms React server rendering, well inside D15's five-second budget
// together with the one DB insert.
//
// `webhookId` is the Standard Webhooks `webhook-id` header, already verified
// by the caller (supabase/functions/auth-email-hook, via
// lib/security/standard-webhooks.ts) before this runs. It -- not
// `email_data.token_hash` -- is the idempotency key material: confirmed
// empirically against a real local GoTrue that a retried hook delivery (a
// network blip, this function briefly unreachable) redelivers the SAME
// event, and that not every action type (password_changed_notification has
// no otp/token at all, unlike signup/recovery) carries a token_hash to key
// on. `webhook-id` is stable across retries of one logical event by the
// Standard Webhooks spec itself, so it dedupes uniformly for every action
// type without needing to know each one's payload quirks.
export async function processAuthEmailHookPayload(
  webhookId: string,
  payload: AuthHookPayload,
  deps: AuthHookDeps,
): Promise<AuthHookOutcome> {
  const kind = await resolveAuthEventKind(payload, deps);
  if (!kind) {
    return { enqueued: false, reason: "unhandled_action_type" };
  }

  const storeId = await resolveStoreId(payload, deps);
  if (!storeId) {
    return { enqueued: false, reason: "store_unresolved" };
  }

  const branding = await deps.loadStoreIdentity(storeId);
  const input = buildTemplateInput(kind, payload, branding);
  const sender = resolveEmailSender(kind, branding.displayName, null);
  const rendered = await renderEmail(input);

  await deps.enqueueEmail({
    storeId,
    templateKind: kind,
    recipientEmail: payload.user.email,
    idempotencyKey: `auth-hook:${webhookId}`,
    fromAddress: sender.from,
    replyToAddress: sender.replyTo ?? null,
    subject: rendered.subject,
    htmlBody: rendered.html,
    textBody: rendered.text,
  });

  return { enqueued: true };
}

// D11's four Auth catalog kinds, narrowed from the full EmailTemplateKind
// union: without this, TypeScript can't tell buildTemplateInput's two
// branches (the password-changed no-link shape vs everything else's
// actionPath shape) apart from the other nine, non-Auth catalog kinds.
type AuthCatalogKind = "signup-confirmation" | "password-recovery" | "password-changed" | "owner-invite" | "new-user-invite";

async function resolveAuthEventKind(payload: AuthHookPayload, deps: AuthHookDeps): Promise<AuthCatalogKind | null> {
  switch (payload.email_data.email_action_type) {
    case "signup":
      return "signup-confirmation";
    case "recovery":
      return "password-recovery";
    case "password_changed_notification":
      return "password-changed";
    case "invite": {
      const intent = await deps.peekAuthIntent(extractIntentToken(payload.email_data.redirect_to) ?? "");
      if (intent?.purpose === "owner_invite") return "owner-invite";
      if (intent?.purpose === "new_user_invite") return "new-user-invite";
      return null;
    }
    default:
      return null;
  }
}

// Trusted-store resolution, never a request header: an intent bound at mint
// time if this event carries one (signup, recovery, and lib/auth/platform-
// identity-invites.ts's invites), else the user's own home store on
// ecommerce.user_profiles for an existing account (password-changed has no
// redirect_to/intent to read at all). Neither match existing is the expected
// shape for an auth.users row this app doesn't own (auth.users is a pool
// shared with sibling apps) -- a graceful skip, not an error.
async function resolveStoreId(payload: AuthHookPayload, deps: AuthHookDeps): Promise<string | null> {
  const intentToken = extractIntentToken(payload.email_data.redirect_to);
  if (intentToken) {
    const intent = await deps.peekAuthIntent(intentToken);
    if (intent) return intent.storeId;
  }

  return deps.loadProfileHomeStore(payload.user.id);
}

function extractIntentToken(redirectTo: string): string | null {
  try {
    return new URL(redirectTo).searchParams.get("intent");
  } catch {
    return null;
  }
}

function buildTemplateInput(
  kind: AuthCatalogKind,
  payload: AuthHookPayload,
  branding: TenantEmailBranding,
): EmailTemplateInput {
  const recipientName = payload.user.user_metadata?.first_name || payload.user.email.split("@")[0];

  if (kind === "password-changed") {
    return { kind, branding, data: { recipientName } };
  }

  return { kind, branding, data: { recipientName, actionPath: buildActionPath(payload) } };
}

// D8: the link is `redirect_to` as-is -- already built by
// lib/auth/prepare-auth-redirect.ts from lib/email/urls.ts's persisted
// subdomain, never re-derived from any header here -- with GoTrue's own
// verification params appended so the destination page (app/auth/callback,
// app/auth/reset-password) can complete the exchange exactly the way it
// already does for the `token_hash`/`type` links documented on
// app/auth/reset-password/page.tsx.
function buildActionPath(payload: AuthHookPayload): string {
  const url = new URL(payload.email_data.redirect_to);
  url.searchParams.set("token_hash", payload.email_data.token_hash);
  url.searchParams.set("type", payload.email_data.email_action_type);
  return `${url.pathname}${url.search}`;
}
