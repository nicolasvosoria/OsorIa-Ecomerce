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

  it("persists the raw Resend error name so quota failures stay distinct (D18)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ name: "daily_quota_exceeded", statusCode: 429, message: "You have reached your daily email quota." }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({
      ok: false,
      errorCode: "daily_quota_exceeded",
      errorMessage: "You have reached your daily email quota.",
    })
  })

  it("falls back to an http_<status> code when the error body is unreadable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("not json") } })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendEmailViaResend("re_test_key", BASE_INPUT)

    expect(result).toEqual({ ok: false, errorCode: "http_500", errorMessage: "Resend respondió 500" })
  })
})
