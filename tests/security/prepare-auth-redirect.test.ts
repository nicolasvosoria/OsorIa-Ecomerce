import { beforeEach, describe, expect, it, vi } from "vitest"

const { verifyTurnstile, getRuntimeStoreId, getServiceEcommerceClient, loadStoreIdentity, mintAuthIntent, rpc } = vi.hoisted(() => ({
  verifyTurnstile: vi.fn(),
  getRuntimeStoreId: vi.fn(),
  getServiceEcommerceClient: vi.fn(),
  loadStoreIdentity: vi.fn(),
  mintAuthIntent: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/lib/security/turnstile", () => ({ verifyTurnstile }))
vi.mock("@/lib/utils/store", () => ({ getRuntimeStoreId }))
vi.mock("@/lib/supabase/service-client", () => ({ getServiceEcommerceClient }))
vi.mock("@/lib/supabase/store-identity-api", () => ({ loadStoreIdentity }))
vi.mock("@/lib/auth/auth-intents", () => ({ mintAuthIntent }))

import { prepareAuthRedirect } from "@/lib/auth/prepare-auth-redirect"

const FAKE_SUPABASE = { rpc }

describe("prepareAuthRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyTurnstile.mockResolvedValue({ ok: true, skipped: true })
    getRuntimeStoreId.mockResolvedValue("store-1")
    getServiceEcommerceClient.mockReturnValue(FAKE_SUPABASE)
    loadStoreIdentity.mockResolvedValue({ subdomain: "cumbre-dorada" })
    rpc.mockResolvedValue({ data: true, error: null })
    mintAuthIntent.mockResolvedValue("raw-intent-token")
  })

  it("mints an intent bound to the store resolved server-side and builds a D8-compliant redirect", async () => {
    const result = await prepareAuthRedirect({
      email: "ana@example.com",
      purpose: "signup",
      path: "/auth/callback",
      turnstileToken: null,
    })

    expect(result).toEqual({
      ok: true,
      redirectTo: "https://cumbre-dorada.osoria.help/auth/callback?intent=raw-intent-token",
    })
    expect(mintAuthIntent).toHaveBeenCalledWith(FAKE_SUPABASE, {
      storeId: "store-1",
      purpose: "signup",
      email: "ana@example.com",
    })
  })

  it("rejects before touching the database when Turnstile fails", async () => {
    verifyTurnstile.mockResolvedValue({ ok: false, reason: "verification_failed" })

    const result = await prepareAuthRedirect({ email: "x@example.com", purpose: "signup", path: "/auth/callback", turnstileToken: "bad" })

    expect(result).toEqual({ ok: false, reason: "turnstile_failed" })
    expect(getServiceEcommerceClient).not.toHaveBeenCalled()
    expect(mintAuthIntent).not.toHaveBeenCalled()
  })

  it("rejects when no store can be resolved server-side (e.g. the admin host)", async () => {
    getRuntimeStoreId.mockResolvedValue(null)

    const result = await prepareAuthRedirect({ email: "x@example.com", purpose: "recovery", path: "/auth/reset-password", turnstileToken: null })

    expect(result).toEqual({ ok: false, reason: "store_unresolved" })
    expect(mintAuthIntent).not.toHaveBeenCalled()
  })

  // D25: reuses ecommerce.check_and_record_send_attempt rather than a
  // second limiter -- the real 60s/5-per-hour enforcement is proven against
  // real Postgres in supabase/checks/verify-email-platform-contract.sql;
  // this proves the RPC call and its `auth:`-namespaced purpose.
  it("calls check_and_record_send_attempt with the auth-namespaced purpose", async () => {
    await prepareAuthRedirect({ email: "ana@example.com", purpose: "signup", path: "/auth/callback", turnstileToken: null })

    expect(rpc).toHaveBeenCalledWith("check_and_record_send_attempt", {
      p_store_id: "store-1",
      p_purpose: "auth:signup",
      p_recipient_email: "ana@example.com",
    })
  })

  it("rejects and never mints an intent when the reused rate limit denies the attempt", async () => {
    rpc.mockResolvedValue({ data: false, error: null })

    const result = await prepareAuthRedirect({ email: "x@example.com", purpose: "signup", path: "/auth/callback", turnstileToken: null })

    expect(result).toEqual({ ok: false, reason: "rate_limited" })
    expect(mintAuthIntent).not.toHaveBeenCalled()
  })

  // C2/D24: a genuine RPC failure must fail closed (deny) too, but with its
  // OWN outcome -- collapsing it into rate_limited reads to an operator as
  // "the customer is just sending too many requests" when the limiter
  // itself is actually down, with nothing to chase. Logged distinctly for
  // the operator; every caller still shows the same generic copy either way
  // (lib/supabase/auth-api.ts's PREPARE_AUTH_REDIRECT_ERROR, proven in
  // tests/auth/signUp.test.ts).
  it("fails closed with a distinct reason, not rate_limited, when the rate-limit RPC call itself errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { message: "db unavailable" } })

    const result = await prepareAuthRedirect({ email: "x@example.com", purpose: "signup", path: "/auth/callback", turnstileToken: null })

    expect(result).toEqual({ ok: false, reason: "rate_limit_check_failed" })
    expect(mintAuthIntent).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(consoleError.mock.calls[0][0])
    expect(logged).toMatchObject({ level: "error", storeId: "store-1", purpose: "auth:signup" })
    consoleError.mockRestore()
  })

  // D24: the reply for an unknown vs a known recipient must be
  // indistinguishable. Every dependency here (Turnstile, the store
  // resolution, the rate limiter) is keyed by the store/request, never by
  // whether `email` has an account -- so the SAME inputs produce the exact
  // same response shape no matter which underlying email is submitted.
  it("produces an identical response shape for two different recipient emails (no enumeration signal)", async () => {
    const forFirstEmail = await prepareAuthRedirect({ email: "known@example.com", purpose: "recovery", path: "/auth/reset-password", turnstileToken: null })
    const forSecondEmail = await prepareAuthRedirect({ email: "unknown@example.com", purpose: "recovery", path: "/auth/reset-password", turnstileToken: null })

    expect(forFirstEmail.ok).toBe(true)
    expect(forSecondEmail.ok).toBe(true)
    expect(Object.keys(forFirstEmail)).toEqual(Object.keys(forSecondEmail))
  })
})
