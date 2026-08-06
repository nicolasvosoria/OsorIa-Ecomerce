import { createHmac } from "node:crypto"

import { describe, expect, it } from "vitest"

import { verifyStandardWebhookSignature } from "@/lib/security/standard-webhooks"

// D15/D41: the exact "valid, invalid, missing, wrong-secret, replayed/expired
// timestamp" matrix the verify criterion names. This is the only place that
// proves the Auth Hook's signature check, since the Hook itself
// (supabase/functions/auth-email-hook) is a thin wrapper this project's
// lint/typecheck exclude -- see this test suite's own README-equivalent, the
// slice brief.
const SECRET = `whsec_${Buffer.from("a-32-byte-test-signing-secret!!!").toString("base64")}`
const BODY = JSON.stringify({ hello: "world" })
const NOW_MS = 1_700_000_000_000

function sign(id: string, timestamp: string, body: string, secret = SECRET): string {
  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64")
  const signature = createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${body}`).digest("base64")
  return `v1,${signature}`
}

describe("verifyStandardWebhookSignature", () => {
  it("accepts a validly signed request", () => {
    const id = "msg_1"
    const timestamp = String(Math.floor(NOW_MS / 1000))

    const result = verifyStandardWebhookSignature(
      BODY,
      { id, timestamp, signature: sign(id, timestamp, BODY) },
      SECRET,
      { nowMs: NOW_MS },
    )

    expect(result).toEqual({ ok: true })
  })

  it("rejects a tampered signature", () => {
    const id = "msg_2"
    const timestamp = String(Math.floor(NOW_MS / 1000))

    const result = verifyStandardWebhookSignature(
      BODY,
      { id, timestamp, signature: "v1,dGFtcGVyZWQ=" },
      SECRET,
      { nowMs: NOW_MS },
    )

    expect(result).toEqual({ ok: false, reason: "signature_mismatch" })
  })

  it("rejects a signature produced with a different secret", () => {
    const id = "msg_3"
    const timestamp = String(Math.floor(NOW_MS / 1000))
    const wrongSecret = `whsec_${Buffer.from("a-completely-different-secret!!").toString("base64")}`

    const result = verifyStandardWebhookSignature(
      BODY,
      { id, timestamp, signature: sign(id, timestamp, BODY, wrongSecret) },
      SECRET,
      { nowMs: NOW_MS },
    )

    expect(result).toEqual({ ok: false, reason: "signature_mismatch" })
  })

  it.each([
    ["webhook-id", { id: null, timestamp: "123", signature: "v1,x" }],
    ["webhook-timestamp", { id: "msg_4", timestamp: null, signature: "v1,x" }],
    ["webhook-signature", { id: "msg_4", timestamp: "123", signature: null }],
  ])("rejects a request missing the %s header", (_name, headers) => {
    const result = verifyStandardWebhookSignature(BODY, headers, SECRET, { nowMs: NOW_MS })

    expect(result).toEqual({ ok: false, reason: "missing_headers" })
  })

  it("rejects a replayed request whose timestamp is far in the past", () => {
    const id = "msg_5"
    const staleTimestamp = String(Math.floor(NOW_MS / 1000) - 60 * 60) // 1 hour old

    const result = verifyStandardWebhookSignature(
      BODY,
      { id, timestamp: staleTimestamp, signature: sign(id, staleTimestamp, BODY) },
      SECRET,
      { nowMs: NOW_MS },
    )

    expect(result).toEqual({ ok: false, reason: "timestamp_out_of_tolerance" })
  })

  it("rejects a timestamp implausibly far in the future (clock-skew/forgery guard)", () => {
    const id = "msg_6"
    const futureTimestamp = String(Math.floor(NOW_MS / 1000) + 60 * 60)

    const result = verifyStandardWebhookSignature(
      BODY,
      { id, timestamp: futureTimestamp, signature: sign(id, futureTimestamp, BODY) },
      SECRET,
      { nowMs: NOW_MS },
    )

    expect(result).toEqual({ ok: false, reason: "timestamp_out_of_tolerance" })
  })

  it("rejects a secret not shaped like whsec_<base64>", () => {
    const id = "msg_7"
    const timestamp = String(Math.floor(NOW_MS / 1000))

    const result = verifyStandardWebhookSignature(
      BODY,
      { id, timestamp, signature: "v1,x" },
      "not-a-whsec-secret",
      { nowMs: NOW_MS },
    )

    expect(result).toEqual({ ok: false, reason: "malformed_secret" })
  })

  it("rejects a body that was mutated after signing", () => {
    const id = "msg_8"
    const timestamp = String(Math.floor(NOW_MS / 1000))
    const signature = sign(id, timestamp, BODY)

    const result = verifyStandardWebhookSignature(
      JSON.stringify({ hello: "tampered" }),
      { id, timestamp, signature },
      SECRET,
      { nowMs: NOW_MS },
    )

    expect(result).toEqual({ ok: false, reason: "signature_mismatch" })
  })
})
