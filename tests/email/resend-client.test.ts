import { afterEach, describe, expect, it, vi } from "vitest"

import { sendEmailViaResend } from "@/lib/email/resend-client"

const BASE_INPUT = {
  from: "Osoria <auth@mail.osoria.help>",
  to: "owner@example.com",
  subject: "Confirma este correo",
  html: "<p>hola</p>",
  text: "hola",
  idempotencyKey: "idem-1",
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("sendEmailViaResend", () => {
  it("posts to the Resend API with the Idempotency-Key header and returns the provider message id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "resend-msg-1" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({ ok: true, providerMessageId: "resend-msg-1" })
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails")
    expect(init.headers.Authorization).toBe("Bearer re_test_key")
    expect(init.headers["Idempotency-Key"]).toBe("idem-1")
    expect(JSON.parse(init.body)).toMatchObject({ from: BASE_INPUT.from, to: [BASE_INPUT.to] })
  })

  it("includes reply_to only when the caller provided one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "x" }) })
    vi.stubGlobal("fetch", fetchMock)

    await sendEmailViaResend("re_test_key", { ...BASE_INPUT, replyTo: "hola@tienda.example" })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body).reply_to).toBe("hola@tienda.example")

    await sendEmailViaResend("re_test_key", BASE_INPUT)
    const [, initWithout] = fetchMock.mock.calls[1]
    expect(JSON.parse(initWithout.body).reply_to).toBeUndefined()
  })

  // D18/D16/A10: a quota rejection is Resend's authoritative, repeatable
  // word on THIS payload (a replay could only ever repeat it, never invent
  // it -- see the idempotency-replay reasoning in resend-client.ts), so it
  // stays non-retryable and keeps advancing the terminal ladder exactly as
  // before this fix.
  it("persists the raw Resend error name so quota failures stay distinct (D18), and are NOT retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ name: "daily_quota_exceeded", statusCode: 429, message: "You have reached your daily email quota." }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({
      ok: false,
      retryable: false,
      errorCode: "daily_quota_exceeded",
      errorMessage: "You have reached your daily email quota.",
    })
  })

  // D16/A10: any 5xx is Resend's own transport failing to answer at all --
  // never evidence the message was rejected, so it must be retryable and
  // never advance the terminal ladder.
  it("falls back to an http_<status> code when the error body is unreadable, and treats any 5xx as retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("not json") } })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({ ok: false, retryable: true, errorCode: "http_500", errorMessage: "Resend respondió 500" })
  })

  it("treats a 503 the same way as any other 5xx: retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: "Service temporarily unavailable" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({ ok: false, retryable: true, errorCode: "http_503", errorMessage: "Service temporarily unavailable" })
  })

  // D16/A10: `rate_limit_exceeded` (too many requests per second) is a
  // different Resend 429 than the D18 quota codes above -- transient, not a
  // rejection of this payload -- so it must be retryable.
  it("treats rate_limit_exceeded (as opposed to a quota code) as retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ name: "rate_limit_exceeded", message: "Too many requests" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({ ok: false, retryable: true, errorCode: "rate_limit_exceeded", errorMessage: "Too many requests" })
  })

  // D16/A10: Resend's own documented "a request under this key is already
  // in flight, safe to retry later" case.
  it("treats concurrent_idempotent_requests as retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ name: "concurrent_idempotent_requests", message: "Request already in progress" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({
      ok: false,
      retryable: true,
      errorCode: "concurrent_idempotent_requests",
      errorMessage: "Request already in progress",
    })
  })

  // A real validation rejection (invalid recipient, unverified domain, ...)
  // is Resend's authoritative word on this payload -- never retryable.
  it("treats a definitive 4xx rejection as NOT retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ name: "validation_error", message: "Invalid `to` field" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({
      ok: false,
      retryable: false,
      errorCode: "validation_error",
      errorMessage: "Invalid `to` field",
    })
  })

  // D16/A10: fetch throwing means the request never even reached Resend --
  // there is no response to have an opinion about this message's fate, so
  // this can only ever be retryable.
  it("treats a network-level failure (fetch throws) as retryable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({ ok: false, retryable: true, errorCode: "network_error", errorMessage: "fetch failed" })
  })
})
