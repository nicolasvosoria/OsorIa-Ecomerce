// D16/D19: the email-outbox worker. Invoked once a minute by the pg_cron
// schedule authored in supabase/migrations/20260805000400_ecommerce_email_
// worker_provisioning.sql (INACTIVE until slice 7 flips it on).
//
// `verify_jwt = false` (supabase/config.toml) because the caller is Postgres,
// not a Supabase Auth session -- there is no user JWT to verify. Authorization
// is the Vault-backed shared secret instead (D19): the cron job's own
// `net.http_post` presents it as a Bearer token, and this function rejects
// any request that doesn't match, so nothing on the public internet can
// trigger a send batch by guessing this URL.
//
// All actual retry/lease/idempotency logic lives in lib/email/outbox-worker.ts
// and lib/email/resend-client.ts (dependency-injected, dual-runtime, and what
// tests/email/outbox-worker.test.ts exercises with a MOCKED sendEmail per
// D41) -- this file only wires the live Deno/Resend/Postgres pieces together.

import { createClient } from "npm:@supabase/supabase-js@2";
import { runEmailOutboxWorkerBatch, type ClaimedOutboxRow } from "../../../lib/email/outbox-worker.ts";
import { sendEmailViaResend } from "../../../lib/email/resend-client.ts";

const WORKER_ID = crypto.randomUUID();
const BATCH_SIZE = 20;

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("EMAIL_WORKER_CRON_SECRET");
  const authorization = req.headers.get("Authorization");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error(JSON.stringify({ level: "error", msg: "RESEND_API_KEY is not configured" }));
    return new Response("RESEND_API_KEY is not configured", { status: 500 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    db: { schema: "ecommerce" },
  });

  const summary = await runEmailOutboxWorkerBatch({
    claimBatch: () => claimBatch(supabase),
    sendEmail: (row) => sendRow(resendApiKey, row),
    markSent: (id, providerMessageId) => markSent(supabase, id, providerMessageId),
    markFailed: (id, errorMessage, errorCode) => markFailed(supabase, id, errorMessage, errorCode),
  });

  console.log(JSON.stringify({ level: "info", msg: "email-outbox-worker batch complete", ...summary }));

  return Response.json(summary);
});

async function claimBatch(supabase: ReturnType<typeof createClient>): Promise<ClaimedOutboxRow[]> {
  const { data, error } = await supabase.rpc("claim_email_outbox_batch", {
    p_worker_id: WORKER_ID,
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    console.error(JSON.stringify({ level: "error", msg: "claim_email_outbox_batch failed", error: error.message }));
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    recipientEmail: row.recipient_email as string,
    fromAddress: row.from_address as string,
    replyToAddress: (row.reply_to_address as string | null) ?? null,
    subject: row.subject as string,
    htmlBody: row.html_body as string,
    textBody: row.text_body as string,
    idempotencyKey: row.idempotency_key as string,
  }));
}

function sendRow(resendApiKey: string, row: ClaimedOutboxRow) {
  return sendEmailViaResend(resendApiKey, {
    from: row.fromAddress,
    to: row.recipientEmail,
    subject: row.subject,
    html: row.htmlBody,
    text: row.textBody,
    idempotencyKey: row.idempotencyKey,
    ...(row.replyToAddress ? { replyTo: row.replyToAddress } : {}),
  });
}

async function markSent(supabase: ReturnType<typeof createClient>, id: string, providerMessageId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_email_outbox_sent", { p_id: id, p_provider_message_id: providerMessageId });
  if (error) {
    console.error(JSON.stringify({ level: "error", msg: "mark_email_outbox_sent failed", id, error: error.message }));
  }
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  id: string,
  errorMessage: string,
  errorCode: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("mark_email_outbox_failed", {
    p_id: id,
    p_error_message: errorMessage,
    p_error_code: errorCode,
  });
  if (error) {
    console.error(JSON.stringify({ level: "error", msg: "mark_email_outbox_failed failed", id, error: error.message }));
  }
}
