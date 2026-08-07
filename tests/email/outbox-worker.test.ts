import { describe, expect, it, vi } from "vitest"

import { runEmailOutboxWorkerBatch, type ClaimedOutboxRow } from "@/lib/email/outbox-worker"

const ROW: ClaimedOutboxRow = {
  id: "row-1",
  recipientEmail: "owner@example.com",
  fromAddress: "Osoria <auth@mail.osoria.help>",
  replyToAddress: null,
  subject: "Confirma este correo",
  htmlBody: "<p>hola</p>",
  textBody: "hola",
  idempotencyKey: "idem-1",
  claimGeneration: 3,
}

const EMPTY_SUMMARY_COUNTS = { sent: 0, failed: 0, markSentFailed: 0, transientFailed: 0, staleWrites: 0 }

describe("runEmailOutboxWorkerBatch", () => {
  it("marks a claimed row sent when the (mocked) Resend call succeeds", async () => {
    const markSent = vi.fn().mockResolvedValue("applied")
    const markFailed = vi.fn().mockResolvedValue("applied")
    const markTransientFailure = vi.fn().mockResolvedValue("applied")

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW] }),
      sendEmail: async () => ({ ok: true, providerMessageId: "resend-msg-1" }),
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({ ok: true, claimed: 1, ...EMPTY_SUMMARY_COUNTS, sent: 1 })
    expect(markSent).toHaveBeenCalledWith("row-1", "resend-msg-1", 3)
    expect(markFailed).not.toHaveBeenCalled()
    expect(markTransientFailure).not.toHaveBeenCalled()
  })

  it("marks a claimed row failed with the provider's error code when the (mocked) send is a definitive rejection", async () => {
    const markSent = vi.fn().mockResolvedValue("applied")
    const markFailed = vi.fn().mockResolvedValue("applied")
    const markTransientFailure = vi.fn().mockResolvedValue("applied")

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW] }),
      sendEmail: async () => ({ ok: false, retryable: false, errorCode: "daily_quota_exceeded", errorMessage: "quota" }),
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({ ok: true, claimed: 1, ...EMPTY_SUMMARY_COUNTS, failed: 1 })
    expect(markFailed).toHaveBeenCalledWith("row-1", "quota", "daily_quota_exceeded", 3)
    expect(markSent).not.toHaveBeenCalled()
    expect(markTransientFailure).not.toHaveBeenCalled()
  })

  // D16/A10 + the Resend idempotency-replay guarantee (resend-client.ts): a
  // retryable failure is never proof this row's message was rejected, so it
  // must never spend one of the four attempts the ladder allows a genuinely
  // rejected send -- markFailed must never be called for it. The full
  // "never ends up failed" guarantee across repeated transient replays is
  // transactional and proven in supabase/checks/verify-email-platform-
  // contract.sql against real Postgres; this only proves the orchestration
  // routes a retryable failure to markTransientFailure instead of markFailed.
  it("routes a retryable send failure to markTransientFailure, never markFailed", async () => {
    const markSent = vi.fn().mockResolvedValue("applied")
    const markFailed = vi.fn().mockResolvedValue("applied")
    const markTransientFailure = vi.fn().mockResolvedValue("applied")

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW] }),
      sendEmail: async () => ({ ok: false, retryable: true, errorCode: "http_503", errorMessage: "service unavailable" }),
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({ ok: true, claimed: 1, ...EMPTY_SUMMARY_COUNTS, transientFailed: 1 })
    expect(markTransientFailure).toHaveBeenCalledWith("row-1", "service unavailable", "http_503", 3)
    expect(markFailed).not.toHaveBeenCalled()
    expect(markSent).not.toHaveBeenCalled()
  })

  it("never calls the real network: sendEmail is always the injected mock", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ ok: true, providerMessageId: "x" })

    await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW, { ...ROW, id: "row-2" }] }),
      sendEmail,
      markSent: vi.fn().mockResolvedValue("applied"),
      markFailed: vi.fn(),
      markTransientFailure: vi.fn(),
    })

    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it("returns an empty summary when there is nothing claimable", async () => {
    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [] }),
      sendEmail: vi.fn(),
      markSent: vi.fn(),
      markFailed: vi.fn(),
      markTransientFailure: vi.fn(),
    })

    expect(summary).toEqual({ ok: true, claimed: 0, ...EMPTY_SUMMARY_COUNTS })
  })

  // PART A: Resend already delivered the email (sendEmail resolved ok) but
  // mark_email_outbox_sent itself failed (network blip, revoked grant). This
  // must never be counted as sent -- that's what let a delivered email drift
  // toward a false "failed" once the row's lease expired, got re-claimed
  // enough times, and mark_email_outbox_failed's own 4-attempt cap kicked in
  // (D16). It must also never fall through to markFailed: that would spend
  // one of D16's four attempts, and eventually terminal-fail a delivered
  // email, on a bookkeeping failure that has nothing to do with delivery.
  it("does not count an rpc_error from mark_email_outbox_sent as sent, and never calls markFailed for it", async () => {
    const markSent = vi.fn().mockResolvedValue("rpc_error")
    const markFailed = vi.fn().mockResolvedValue("applied")
    const markTransientFailure = vi.fn().mockResolvedValue("applied")

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW] }),
      sendEmail: async () => ({ ok: true, providerMessageId: "resend-msg-1" }),
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({ ok: true, claimed: 1, ...EMPTY_SUMMARY_COUNTS, markSentFailed: 1 })
    expect(markSent).toHaveBeenCalledWith("row-1", "resend-msg-1", 3)
    expect(markFailed).not.toHaveBeenCalled()
    expect(markTransientFailure).not.toHaveBeenCalled()
  })

  // D16/A10's race fix: worker A's claim was superseded by a later claim
  // (its Resend response finally resolved after its lease already expired
  // and someone else reclaimed) -- the mark_email_outbox_sent RPC itself
  // ran fine but correctly rejected the stale write (claim_generation no
  // longer current). This must count toward staleWrites, NEVER toward sent
  // (nothing was actually written) and never toward markSentFailed (this
  // isn't an RPC failure -- the row's true state IS known, just not to
  // this stale worker).
  it("counts a stale mark_email_outbox_sent write toward staleWrites, never sent or markSentFailed", async () => {
    const markSent = vi.fn().mockResolvedValue("stale")
    const markFailed = vi.fn().mockResolvedValue("applied")
    const markTransientFailure = vi.fn().mockResolvedValue("applied")

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW] }),
      sendEmail: async () => ({ ok: true, providerMessageId: "resend-msg-1" }),
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({ ok: true, claimed: 1, ...EMPTY_SUMMARY_COUNTS, staleWrites: 1 })
  })

  // Same fencing rejection, the definitive-rejection branch: a stale
  // markFailed must never be counted as failed (the row it was about was
  // already resolved by whoever holds the current claim_generation).
  it("counts a stale mark_email_outbox_failed write toward staleWrites, never failed", async () => {
    const markSent = vi.fn().mockResolvedValue("applied")
    const markFailed = vi.fn().mockResolvedValue("stale")
    const markTransientFailure = vi.fn().mockResolvedValue("applied")

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW] }),
      sendEmail: async () => ({ ok: false, retryable: false, errorCode: "validation_error", errorMessage: "invalid recipient" }),
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({ ok: true, claimed: 1, ...EMPTY_SUMMARY_COUNTS, staleWrites: 1 })
  })

  // Same fencing rejection, the transient-failure branch: a stale
  // markTransientFailure must never be counted as transientFailed.
  it("counts a stale mark_email_outbox_transient_failure write toward staleWrites, never transientFailed", async () => {
    const markSent = vi.fn().mockResolvedValue("applied")
    const markFailed = vi.fn().mockResolvedValue("applied")
    const markTransientFailure = vi.fn().mockResolvedValue("stale")

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: true, rows: [ROW] }),
      sendEmail: async () => ({ ok: false, retryable: true, errorCode: "http_503", errorMessage: "service unavailable" }),
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({ ok: true, claimed: 1, ...EMPTY_SUMMARY_COUNTS, staleWrites: 1 })
  })

  // PART B: a broken claim_email_outbox_batch (revoked grant, renamed
  // signature, lock timeout) must surface as a distinct failure the caller
  // can turn into a non-200, never collapse into "zero rows claimed" -- an
  // empty batch and a broken claim are indistinguishable from an idle queue
  // on every one of the 1440 daily cron ticks otherwise.
  it("surfaces a failed claim as ok:false instead of an empty batch, and never calls send/mark", async () => {
    const sendEmail = vi.fn()
    const markSent = vi.fn()
    const markFailed = vi.fn()
    const markTransientFailure = vi.fn()

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => ({ ok: false, error: "permission denied for function claim_email_outbox_batch" }),
      sendEmail,
      markSent,
      markFailed,
      markTransientFailure,
    })

    expect(summary).toEqual({
      ok: false,
      reason: "claim_failed",
      error: "permission denied for function claim_email_outbox_batch",
    })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(markSent).not.toHaveBeenCalled()
    expect(markFailed).not.toHaveBeenCalled()
    expect(markTransientFailure).not.toHaveBeenCalled()
  })
})
