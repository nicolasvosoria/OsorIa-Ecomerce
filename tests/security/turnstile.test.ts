import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { verifyTurnstile } from "@/lib/security/turnstile"

describe("verifyTurnstile", () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalSecret
    }
  })

  // D26's decision: unconfigured is fail-OPEN, loudly logged -- see the
  // reasoning in lib/security/turnstile.ts. This is the "absent" half of the
  // verify criterion.
  it("skips verification and never calls Cloudflare when unconfigured", async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await verifyTurnstile("any-token")

    expect(result).toEqual({ ok: true, skipped: true })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("skips verification even when no token was submitted at all, while unconfigured", async () => {
    delete process.env.TURNSTILE_SECRET_KEY

    const result = await verifyTurnstile(null)

    expect(result).toEqual({ ok: true, skipped: true })
  })

  // The "present" half: once a secret is configured, a missing token is
  // rejected without even calling Cloudflare.
  it("rejects a missing token once Turnstile is configured", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret"
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await verifyTurnstile(null)

    expect(result).toEqual({ ok: false, reason: "missing_token" })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("accepts a token Cloudflare confirms as successful", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const result = await verifyTurnstile("solved-challenge-token")

    expect(result).toEqual({ ok: true, skipped: false })
  })

  it("sends the token and configured secret to Cloudflare's siteverify endpoint", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret"
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

    await verifyTurnstile("solved-challenge-token")

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ secret: "test-secret", response: "solved-challenge-token" }),
      }),
    )
  })

  it("rejects a token Cloudflare reports as failed", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 }),
    )

    const result = await verifyTurnstile("bad-token")

    expect(result).toEqual({ ok: false, reason: "verification_failed" })
  })

  it("rejects (never throws) when the siteverify request itself fails", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret"
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"))

    const result = await verifyTurnstile("any-token")

    expect(result).toEqual({ ok: false, reason: "verification_failed" })
  })
})
