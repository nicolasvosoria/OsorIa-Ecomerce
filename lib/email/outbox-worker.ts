import type { ResendSendEmailResult } from "./resend-client";

export type ClaimedOutboxRow = {
  id: string;
  recipientEmail: string;
  fromAddress: string;
  replyToAddress: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  idempotencyKey: string;
};

export type OutboxWorkerDeps = {
  claimBatch: () => Promise<ClaimedOutboxRow[]>;
  sendEmail: (row: ClaimedOutboxRow) => Promise<ResendSendEmailResult>;
  markSent: (id: string, providerMessageId: string) => Promise<void>;
  markFailed: (id: string, errorMessage: string, errorCode: string | null) => Promise<void>;
};

export type OutboxWorkerRunSummary = {
  claimed: number;
  sent: number;
  failed: number;
};

// D16's whole loop in one place, deliberately runtime-agnostic (no Deno/Node
// API): claim → send → record outcome, one row at a time so a slow or
// throttled send never blocks the rest of the batch behind it. Real
// claim/send/mark implementations are injected -- supabase/functions/
// email-worker/index.ts wires the live ones; tests wire a MOCKED sendEmail
// (D41) so no test call ever reaches Resend.
export async function runEmailOutboxWorkerBatch(deps: OutboxWorkerDeps): Promise<OutboxWorkerRunSummary> {
  const rows = await deps.claimBatch();
  const summary: OutboxWorkerRunSummary = { claimed: rows.length, sent: 0, failed: 0 };

  for (const row of rows) {
    const result = await deps.sendEmail(row);

    if (result.ok) {
      await deps.markSent(row.id, result.providerMessageId);
      summary.sent += 1;
    } else {
      await deps.markFailed(row.id, result.errorMessage, result.errorCode);
      summary.failed += 1;
    }
  }

  return summary;
}
