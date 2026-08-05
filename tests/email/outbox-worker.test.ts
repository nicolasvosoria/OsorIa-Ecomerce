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
}

describe("runEmailOutboxWorkerBatch", () => {
  it("marks a claimed row sent when the (mocked) Resend call succeeds", async () => {
    const markSent = vi.fn().mockResolvedValue(undefined)
    const markFailed = vi.fn().mockResolvedValue(undefined)

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => [ROW],
      sendEmail: async () => ({ ok: true, providerMessageId: "resend-msg-1" }),
      markSent,
      markFailed,
    })

    expect(summary).toEqual({ claimed: 1, sent: 1, failed: 0 })
    expect(markSent).toHaveBeenCalledWith("row-1", "resend-msg-1")
    expect(markFailed).not.toHaveBeenCalled()
  })

  it("marks a claimed row failed with the provider's error code when the (mocked) send fails", async () => {
    const markSent = vi.fn().mockResolvedValue(undefined)
    const markFailed = vi.fn().mockResolvedValue(undefined)

    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => [ROW],
      sendEmail: async () => ({ ok: false, errorCode: "daily_quota_exceeded", errorMessage: "quota" }),
      markSent,
      markFailed,
    })

    expect(summary).toEqual({ claimed: 1, sent: 0, failed: 1 })
    expect(markFailed).toHaveBeenCalledWith("row-1", "quota", "daily_quota_exceeded")
    expect(markSent).not.toHaveBeenCalled()
  })

  it("never calls the real network: sendEmail is always the injected mock", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ ok: true, providerMessageId: "x" })

    await runEmailOutboxWorkerBatch({
      claimBatch: async () => [ROW, { ...ROW, id: "row-2" }],
      sendEmail,
      markSent: vi.fn(),
      markFailed: vi.fn(),
    })

    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it("returns an empty summary when there is nothing claimable", async () => {
    const summary = await runEmailOutboxWorkerBatch({
      claimBatch: async () => [],
      sendEmail: vi.fn(),
      markSent: vi.fn(),
      markFailed: vi.fn(),
    })

    expect(summary).toEqual({ claimed: 0, sent: 0, failed: 0 })
  })
})
