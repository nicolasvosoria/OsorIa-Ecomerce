import type { ResendSendEmailResult } from "./resend-client.ts";

export type ClaimedOutboxRow = {
  id: string;
  recipientEmail: string;
  fromAddress: string;
  replyToAddress: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  idempotencyKey: string;
  // The optimistic-concurrency fencing token claim_email_outbox_batch just
  // minted for THIS claim (ecommerce.email_outbox.claim_generation, bumped
  // on every claim). Must be threaded back into every mark_email_outbox_*
  // call below -- see MarkWriteOutcome for why.
  claimGeneration: number;
};

// A broken claim_email_outbox_batch RPC (revoked grant, renamed signature,
// lock timeout) must reach the caller as a distinct outcome, never collapse
// into "zero rows claimed" -- see runEmailOutboxWorkerBatch's own ok:false
// branch below for why that distinction matters.
export type ClaimBatchResult =
  | { ok: true; rows: ClaimedOutboxRow[] }
  | { ok: false; error: string };

// Each mark_email_outbox_* RPC now gates its write on the row's CURRENT
// claim_generation still matching the one this call was handed (D16/A10's
// race fix -- see the comment on OutboxWorkerDeps.markSent below):
//   "applied"   -- the write happened, this claim was still current.
//   "stale"     -- the RPC itself succeeded, but the row's claim_generation
//                  had already moved on (a later claim superseded this one)
//                  -- the write correctly no-op'd. Not an error to retry:
//                  the work this call describes is void by definition,
//                  whoever holds the CURRENT generation already resolved
//                  the row, or will. But per D36 it must not vanish either
//                  -- see OutboxWorkerRunSummary.staleWrites.
//   "rpc_error" -- the RPC call itself failed (network/grant/etc.), same
//                  meaning as the pre-fencing boolean-false case: the row's
//                  true state is unknown to this worker.
export type MarkWriteOutcome = "applied" | "stale" | "rpc_error";

export type OutboxWorkerDeps = {
  claimBatch: () => Promise<ClaimBatchResult>;
  sendEmail: (row: ClaimedOutboxRow) => Promise<ResendSendEmailResult>;
  // D16/A10's race fix: a worker whose Resend response outlives its lease
  // (no client-side timeout tied to the 2-minute lease, and in production
  // each RPC call commits on its own -- no transaction spans claim->send->
  // mark) can have its STALE response resolve after a second worker already
  // reclaimed, sent and marked the row `sent`. claimGeneration lets
  // mark_email_outbox_sent reject that stale write instead of letting it
  // race a newer, already-applied one.
  markSent: (id: string, providerMessageId: string, claimGeneration: number) => Promise<MarkWriteOutcome>;
  markFailed: (
    id: string,
    errorMessage: string,
    errorCode: string | null,
    claimGeneration: number,
  ) => Promise<MarkWriteOutcome>;
  // D16/A10 + the Resend idempotency-replay guarantee (resend-client.ts): a
  // RETRYABLE send failure is never evidence the message was rejected, so it
  // must never advance the terminal ladder the way markFailed does. This
  // only records last_error/last_error_code (D36 visibility) and leaves the
  // row exactly as claim left it (`processing`, its lease still ticking) --
  // the SAME lease-expiry reclaim D16 already built for a markSent failure
  // retries it, no second retry loop to build or reason about here. Same
  // claim_generation fence as markSent/markFailed.
  markTransientFailure: (
    id: string,
    errorMessage: string,
    errorCode: string | null,
    claimGeneration: number,
  ) => Promise<MarkWriteOutcome>;
};

export type OutboxWorkerRunSummary =
  | {
      ok: true;
      claimed: number;
      sent: number;
      failed: number;
      markSentFailed: number;
      transientFailed: number;
      // D16/A10's race fix, D36 visibility: a mark_email_outbox_* call whose
      // claim_generation was already superseded by a later claim. Never
      // counted toward sent/failed/transientFailed (none of those writes
      // actually happened), and never retried by this worker (the row
      // already has a newer owner, or is already resolved) -- but must stay
      // visible: a positive, sustained staleWrites is the signal that the
      // 2-minute lease is too short for real Resend latency.
      staleWrites: number;
    }
  | { ok: false; reason: "claim_failed"; error: string };

// D16's whole loop in one place, deliberately runtime-agnostic (no Deno/Node
// API): claim → send → record outcome, one row at a time so a slow or
// throttled send never blocks the rest of the batch behind it. Real
// claim/send/mark implementations are injected -- supabase/functions/
// email-worker/index.ts wires the live ones; tests wire a MOCKED sendEmail
// (D41) so no test call ever reaches Resend.
export async function runEmailOutboxWorkerBatch(deps: OutboxWorkerDeps): Promise<OutboxWorkerRunSummary> {
  const claimed = await deps.claimBatch();
  if (!claimed.ok) {
    return { ok: false, reason: "claim_failed", error: claimed.error };
  }

  const summary = {
    ok: true as const,
    claimed: claimed.rows.length,
    sent: 0,
    failed: 0,
    markSentFailed: 0,
    transientFailed: 0,
    staleWrites: 0,
  };

  for (const row of claimed.rows) {
    const result = await deps.sendEmail(row);

    if (!result.ok) {
      // D16/A10: a retryable failure (5xx, rate-limited, network blip -- see
      // resend-client.ts's isRetryableFailure) is never proof this row's
      // message was rejected, so it must never spend one of the four
      // attempts D16/A10's ladder allows a GENUINELY rejected send. Only a
      // non-retryable, definitive rejection advances markFailed's terminal
      // ladder -- unchanged from before this fix.
      if (result.retryable) {
        const outcome = await deps.markTransientFailure(row.id, result.errorMessage, result.errorCode, row.claimGeneration);
        if (outcome === "applied") {
          summary.transientFailed += 1;
        } else if (outcome === "stale") {
          summary.staleWrites += 1;
        }
        // "rpc_error": no counter change, matches this RPC's own pre-fencing
        // behavior -- only ever logged (supabase/functions/email-worker/
        // index.ts), the row's true state stays unknown to this worker.
      } else {
        const outcome = await deps.markFailed(row.id, result.errorMessage, result.errorCode, row.claimGeneration);
        if (outcome === "applied") {
          summary.failed += 1;
        } else if (outcome === "stale") {
          summary.staleWrites += 1;
        }
      }
      continue;
    }

    // D16: Resend already delivered this row (the Idempotency-Key at
    // resend-client.ts makes any later retry of the SEND a safe no-op
    // replay), so a failed mark_email_outbox_sent must never be counted as
    // sent, and must never fall through to markFailed -- that would let a
    // delivered email be labelled failed once attempt_count reaches the
    // fourth claim (D36's whole point: email_outbox_health must never lie).
    // Leaving the row in processing on a "rpc_error" outcome is deliberate:
    // its lease expires and the next tick reclaims it, retrying the mark
    // through the exact mechanism D16 already built for a worker that dies
    // mid-batch -- no separate retry loop to build or reason about here. A
    // "stale" outcome means a NEWER claim already resolved this row (D16/
    // A10's race fix); nothing further to do for it here either.
    const outcome = await deps.markSent(row.id, result.providerMessageId, row.claimGeneration);
    if (outcome === "applied") {
      summary.sent += 1;
    } else if (outcome === "stale") {
      summary.staleWrites += 1;
    } else {
      summary.markSentFailed += 1;
    }
  }

  return summary;
}
