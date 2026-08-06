// D15: the Supabase Auth Send Email Hook. Verifies the Standard Webhooks
// signature, resolves which store an Auth event belongs to, renders the
// matching D11 catalog template, and enqueues it into the SAME
// ecommerce.email_outbox slice 2 built (D14) -- never calls Resend itself
// (lib/email/outbox-worker.ts / supabase/functions/email-worker still own
// that, unchanged). All decision logic lives in lib/email/auth-hook.ts
// (dependency-injected, tested by tests/email/auth-hook.test.ts per D41);
// this file only wires the live Deno/Postgres/Web Crypto pieces together --
// this is the one Deno file the repo's lint/typecheck exclude, so it must
// stay a thin wrapper.
//
// AUTHORED and locally verified here only (HARD BOUNDARY): registering this
// against the real project's Auth settings is slice 7's job, documented in
// docs/supabase/email-outbox-runbook.md.
//
// `verify_jwt = false` (supabase/config.toml) because the caller is GoTrue,
// not a Supabase Auth session of this app's own -- there is no user JWT to
// verify. Authorization is the Standard Webhooks signature instead.

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyStandardWebhookSignature } from "../../../lib/security/standard-webhooks.ts";
import {
  processAuthEmailHookPayload,
  type AuthHookDeps,
  type AuthHookPayload,
  type EnqueueAuthEmailRow,
} from "../../../lib/email/auth-hook.ts";
import type { TenantEmailBranding } from "../../../lib/email/types.ts";

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id");

  const secret = Deno.env.get("AUTH_EMAIL_HOOK_SECRET");
  if (!secret) {
    console.error(JSON.stringify({ level: "error", msg: "AUTH_EMAIL_HOOK_SECRET is not configured" }));
    return hookError(500, "AUTH_EMAIL_HOOK_SECRET is not configured");
  }

  const verification = verifyStandardWebhookSignature(rawBody, {
    id: webhookId,
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
  }, secret);

  if (!verification.ok) {
    return hookError(401, `invalid webhook signature: ${verification.reason}`);
  }

  let payload: AuthHookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return hookError(400, "invalid JSON payload");
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    db: { schema: "ecommerce" },
  });

  try {
    const outcome = await processAuthEmailHookPayload(webhookId!, payload, buildDeps(supabase));
    console.log(JSON.stringify({
      level: "info",
      msg: "auth-email-hook processed",
      actionType: payload.email_data?.email_action_type,
      ...outcome,
    }));
    return Response.json({});
  } catch (error) {
    console.error(JSON.stringify({ level: "error", msg: "auth-email-hook failed", error: String(error) }));
    return hookError(500, "internal error enqueueing the auth email");
  }
});

function hookError(httpCode: number, message: string): Response {
  return Response.json({ error: { http_code: httpCode, message } }, { status: httpCode });
}

function buildDeps(supabase: ReturnType<typeof createClient>): AuthHookDeps {
  return {
    peekAuthIntent: (token) => peekAuthIntent(supabase, token),
    loadStoreIdentity: (storeId) => loadStoreIdentity(supabase, storeId),
    loadProfileHomeStore: (userId) => loadProfileHomeStore(supabase, userId),
    enqueueEmail: (row) => enqueueEmail(supabase, row),
  };
}

async function peekAuthIntent(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ storeId: string; purpose: string } | null> {
  if (!token) return null;

  const { data } = await supabase
    .from("auth_intents")
    .select("store_id, purpose, expires_at")
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle();

  if (!data || new Date(data.expires_at as string).getTime() <= Date.now()) {
    return null;
  }

  return { storeId: data.store_id as string, purpose: data.purpose as string };
}

async function loadProfileHomeStore(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await supabase.from("user_profiles").select("signup_store_id").eq("id", userId).maybeSingle();
  return (data?.signup_store_id as string | null) ?? null;
}

// Deliberately its own direct 3-table read rather than importing
// lib/supabase/store-identity-api.ts's loadStoreIdentity: that module (and
// its `@/...`-aliased, Node-`crypto`-importing neighbors) is not Deno-loadable
// (see lib/email/render.tsx and its siblings for the general shape of that
// constraint, and this file's own header comment). Same three tables, same
// columns Next.js's loadStoreIdentity reads.
async function loadStoreIdentity(supabase: ReturnType<typeof createClient>, storeId: string): Promise<TenantEmailBranding> {
  const [storeResult, brandingResult, contactResult] = await Promise.all([
    supabase.from("stores").select("store_name, subdomain, legal_name").eq("id", storeId).maybeSingle(),
    supabase.from("store_branding").select("logo_url, primary_color").eq("store_id", storeId).maybeSingle(),
    supabase.from("store_contact").select("contact_email, contact_phone, address").eq("store_id", storeId).maybeSingle(),
  ]);

  const store = storeResult.data as { store_name: string; subdomain: string; legal_name: string | null } | null;
  const branding = brandingResult.data as { logo_url: string | null; primary_color: string | null } | null;
  const contact = contactResult.data as { contact_email: string | null; contact_phone: string | null; address: string | null } | null;

  return {
    displayName: store?.store_name ?? "",
    validatedSubdomain: store?.subdomain ?? "",
    primaryColor: branding?.primary_color ?? "",
    commercialAddress: contact?.address ?? "",
    ...(branding?.logo_url ? { logoUrl: branding.logo_url } : {}),
    ...(contact?.contact_email ? { contactEmail: contact.contact_email } : {}),
    ...(contact?.contact_phone ? { contactPhone: contact.contact_phone } : {}),
  };
}

// D1's idempotency-key contract extends here too: a GoTrue retry of the SAME
// event (same token_hash) hits email_outbox's unique index on
// idempotency_key and fails with 23505 -- that IS success (already enqueued),
// not a real error, so it is swallowed specifically and only for that code.
async function enqueueEmail(supabase: ReturnType<typeof createClient>, row: EnqueueAuthEmailRow): Promise<void> {
  const { error } = await supabase.from("email_outbox").insert({
    store_id: row.storeId,
    template_kind: row.templateKind,
    recipient_email: row.recipientEmail,
    idempotency_key: row.idempotencyKey,
    from_address: row.fromAddress,
    reply_to_address: row.replyToAddress,
    subject: row.subject,
    html_body: row.htmlBody,
    text_body: row.textBody,
  });

  if (error && error.code !== "23505") {
    throw new Error(`email_outbox insert failed: ${error.message}`);
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
