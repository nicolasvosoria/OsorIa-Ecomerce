// D16/D19: the email-outbox worker. Invoked once a minute by the pg_cron
// schedule authored in supabase/migrations/20260805000400_ecommerce_email_
// worker_provisioning.sql (INACTIVE until `cron.alter_job` enables it on the
// real project).
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
// D41) -- this file only wires the live Deno/Resend/Postgres pieces together,
// including the claim_generation fencing token every mark_email_outbox_*
// RPC now requires (D16/A10's race fix -- see outbox-worker.ts's
// MarkWriteOutcome).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  runEmailOutboxWorkerBatch,
  type ClaimBatchResult,
  type ClaimedOutboxRow,
  type MarkWriteOutcome,
} from "../../../lib/email/outbox-worker.ts";
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
    markSent: (id, providerMessageId, claimGeneration) => markSent(supabase, id, providerMessageId, claimGeneration),
    markFailed: (id, errorMessage, errorCode, claimGeneration) =>
      markFailed(supabase, id, errorMessage, errorCode, claimGeneration),
    markTransientFailure: (id, errorMessage, errorCode, claimGeneration) =>
      markTransientFailure(supabase, id, errorMessage, errorCode, claimGeneration),
  });

  if (!summary.ok) {
    // D16/D36: a broken claim (revoked grant, renamed signature, lock
    // timeout) must reach the cron job as a failed invocation it records,
    // never a green "nothing to do" -- see runEmailOutboxWorkerBatch.
    console.error(JSON.stringify({ level: "error", msg: "email-outbox-worker batch failed", ...summary }));
    return Response.json(summary, { status: 500 });
  }

  console.log(JSON.stringify({ level: "info", msg: "email-outbox-worker batch complete", ...summary }));

  return Response.json(summary);
});

async function claimBatch(supabase: ReturnType<typeof createClient>): Promise<ClaimBatchResult> {
  const { data, error } = await supabase.rpc("claim_email_outbox_batch", {
    p_worker_id: WORKER_ID,
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    console.error(JSON.stringify({ level: "error", msg: "claim_email_outbox_batch failed", error: error.message }));
    return { ok: false, error: error.message };
  }

  const rows: ClaimedOutboxRow[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    recipientEmail: row.recipient_email as string,
    fromAddress: row.from_address as string,
    replyToAddress: (row.reply_to_address as string | null) ?? null,
    subject: row.subject as string,
    htmlBody: row.html_body as string,
    textBody: row.text_body as string,
    idempotencyKey: row.idempotency_key as string,
    claimGeneration: row.claim_generation as number,
  }));

  return { ok: true, rows };
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

async function markSent(
  supabase: ReturnType<typeof createClient>,
  id: string,
  providerMessageId: string,
  claimGeneration: number,
): Promise<MarkWriteOutcome> {
  const { data, error } = await supabase.rpc("mark_email_outbox_sent", {
    p_id: id,
    p_provider_message_id: providerMessageId,
    p_claim_generation: claimGeneration,
  });
  if (error) {
    console.error(JSON.stringify({ level: "error", msg: "mark_email_outbox_sent failed", id, error: error.message }));
    return "rpc_error";
  }
  if (data !== true) {
    logStaleWrite("mark_email_outbox_sent", id, claimGeneration);
    return "stale";
  }
  return "applied";
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  id: string,
  errorMessage: string,
  errorCode: string | null,
  claimGeneration: number,
): Promise<MarkWriteOutcome> {
  const { data, error } = await supabase.rpc("mark_email_outbox_failed", {
    p_id: id,
    p_claim_generation: claimGeneration,
    p_error_message: errorMessage,
    p_error_code: errorCode,
  });
  if (error) {
    console.error(JSON.stringify({ level: "error", msg: "mark_email_outbox_failed failed", id, error: error.message }));
    return "rpc_error";
  }
  if (data !== true) {
    logStaleWrite("mark_email_outbox_failed", id, claimGeneration);
    return "stale";
  }
  return "applied";
}

async function markTransientFailure(
  supabase: ReturnType<typeof createClient>,
  id: string,
  errorMessage: string,
  errorCode: string | null,
  claimGeneration: number,
): Promise<MarkWriteOutcome> {
  const { data, error } = await supabase.rpc("mark_email_outbox_transient_failure", {
    p_id: id,
    p_claim_generation: claimGeneration,
    p_error_message: errorMessage,
    p_error_code: errorCode,
  });
  if (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "mark_email_outbox_transient_failure failed", id, error: error.message }),
    );
    return "rpc_error";
  }
  if (data !== true) {
    logStaleWrite("mark_email_outbox_transient_failure", id, claimGeneration);
    return "stale";
  }
  return "applied";
}

// D16/A10's race fix + D36: the RPC itself succeeded, but the row's
// claim_generation had already moved past the one this call was handed --
// a later claim (this same worker on a subsequent tick, or a different one)
// superseded it. Logged distinctly (never folded into the RPC-error lines
// above) so an operator can tell "the write was rejected because it was
// stale" apart from "the write failed to run at all" -- and a sustained
// stream of these for the same id is the signal the 2-minute lease is too
// short for real Resend latency. See the runbook.
function logStaleWrite(rpcName: string, id: string, claimGeneration: number): void {
  console.error(
    JSON.stringify({
      level: "error",
      msg: `${rpcName} stale: claim_generation no longer current, write rejected`,
      id,
      workerId: WORKER_ID,
      claimGeneration,
    }),
  );
}
