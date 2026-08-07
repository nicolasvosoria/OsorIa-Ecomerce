import { beforeEach, describe, expect, it, vi } from "vitest"

const { resolveServerAuthSession, getServiceEcommerceClient, rpc, getUser } = vi.hoisted(() => ({
  resolveServerAuthSession: vi.fn(),
  getServiceEcommerceClient: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock("@/lib/supabase/server-auth-session", () => ({ resolveServerAuthSession }))
vi.mock("@/lib/supabase/service-client", () => ({ getServiceEcommerceClient }))

import { finalizeCustomerSignup } from "@/lib/auth/finalize-signup-action"

const SESSION_CLIENT = { auth: { getUser } }

describe("finalizeCustomerSignup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    getServiceEcommerceClient.mockReturnValue({ rpc })
    getUser.mockResolvedValue({ data: { user: { user_metadata: { first_name: "Ana", last_name: "Lovelace" } } } })
  })

  // D23: this only ever has work to do the first time a fresh signup's
  // confirmation lands -- a plain login (no intent in the URL at all) must
  // never touch the database.
  it("is a no-op when there is no intent token (a plain login, not a fresh signup)", async () => {
    const result = await finalizeCustomerSignup(null)

    expect(result).toEqual({ ok: true })
    expect(resolveServerAuthSession).not.toHaveBeenCalled()
  })

  it("fails (and logs) when there is no live session to resolve the user from", async () => {
    resolveServerAuthSession.mockResolvedValue(null)

    const result = await finalizeCustomerSignup("raw-intent-token")

    expect(result).toEqual({ ok: false })
    expect(rpc).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  // Finding 1: the app's own call path must go through the service-role
  // client -- ecommerce.finalize_customer_profile grants EXECUTE to
  // service_role only, never authenticated (the session's own client), so
  // calling it any other way is a guaranteed 42501 in real Postgres.
  it("calls the RPC through the service-role client, never the session's own client", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "user-1", email: "ana@example.com", client: SESSION_CLIENT })
    rpc.mockResolvedValue({ data: { ok: true, created: true, store_id: "store-1" }, error: null })

    await finalizeCustomerSignup("raw-intent-token")

    expect(getServiceEcommerceClient).toHaveBeenCalled()
  })

  // D23: the user id/email come from the server's OWN session read, never
  // from anything the client asserts -- and the token is hashed before it
  // ever reaches the database (lib/security/verification-token.ts's
  // contract: only the hash is ever persisted or compared).
  it("calls ecommerce.finalize_customer_profile with the session's own identity and the hashed intent", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "user-1", email: "ana@example.com", client: SESSION_CLIENT })
    rpc.mockResolvedValue({ data: { ok: true, created: true, store_id: "store-1" }, error: null })

    const result = await finalizeCustomerSignup("raw-intent-token")

    expect(result).toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledWith("finalize_customer_profile", {
      p_user_id: "user-1",
      p_email: "ana@example.com",
      p_first_name: "Ana",
      p_last_name: "Lovelace",
      p_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it("surfaces a database rejection (e.g. an already-consumed or expired intent) as ok:false and logs it", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "user-1", email: "ana@example.com", client: SESSION_CLIENT })
    rpc.mockResolvedValue({ data: { ok: false, reason: "invalid_or_expired_intent" }, error: null })

    const result = await finalizeCustomerSignup("raw-intent-token")

    expect(result).toEqual({ ok: false })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("invalid_or_expired_intent"))
  })

  // Finding 2: a 42501 permission failure (the exact shape Finding 1 fixes)
  // must never disappear silently -- it has to reach the server logs so an
  // operator, not just a customer stuck with signup_store_id = NULL, can see it.
  it("logs a database/RPC error (e.g. a permission failure) instead of swallowing it", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "user-1", email: "ana@example.com", client: SESSION_CLIENT })
    rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied for function finalize_customer_profile" } })

    const result = await finalizeCustomerSignup("raw-intent-token")

    expect(result).toEqual({ ok: false })
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("permission denied for function finalize_customer_profile"))
  })

  it("fails (and logs) when the service-role client is unavailable (missing config)", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "user-1", email: "ana@example.com", client: SESSION_CLIENT })
    getServiceEcommerceClient.mockReturnValue(null)

    const result = await finalizeCustomerSignup("raw-intent-token")

    expect(result).toEqual({ ok: false })
    expect(rpc).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
