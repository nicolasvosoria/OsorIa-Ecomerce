import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { verifyTurnstile } from "@/lib/security/turnstile"

describe("verifyTurnstile", () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY
  const originalVercelEnv = process.env.VERCEL_ENV

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalSecret
    }

    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV
    } else {
      process.env.VERCEL_ENV = originalVercelEnv
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

  // The runtime-detection split: VERCEL_ENV === "production" is the only
  // signal that flips an unconfigured secret from fail-open to fail-closed
  // -- see lib/security/turnstile.ts's reasoning comment for why VERCEL_ENV
  // and not NODE_ENV (which is "production" for previews too).
  it("fails closed and logs a structured error when unconfigured in production", async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.VERCEL_ENV = "production"
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await verifyTurnstile("any-token")

    expect(result).toEqual({ ok: false, reason: "verification_failed" })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: "error",
        msg: "turnstile: TURNSTILE_SECRET_KEY is not configured in production, failing closed",
      }),
    )
  })

  it("still verifies normally in production once a secret is configured", async () => {
    process.env.VERCEL_ENV = "production"
    process.env.TURNSTILE_SECRET_KEY = "test-secret"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const result = await verifyTurnstile("solved-challenge-token")

    expect(result).toEqual({ ok: true, skipped: false })
  })

  it("keeps failing open outside production even when other preview-like env vars are set", async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.VERCEL_ENV = "preview"
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const result = await verifyTurnstile("any-token")

    expect(result).toEqual({ ok: true, skipped: true })
    expect(warnSpy).toHaveBeenCalled()
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
