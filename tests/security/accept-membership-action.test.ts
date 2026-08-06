import { beforeEach, describe, expect, it, vi } from "vitest"

const { resolveServerAuthSession, getServiceEcommerceClient, hashVerificationToken } = vi.hoisted(() => ({
  resolveServerAuthSession: vi.fn(),
  getServiceEcommerceClient: vi.fn(),
  hashVerificationToken: vi.fn(),
}))

vi.mock("@/lib/supabase/server-auth-session", () => ({ resolveServerAuthSession }))
vi.mock("@/lib/supabase/service-client", () => ({ getServiceEcommerceClient }))
vi.mock("@/lib/security/verification-token", () => ({ hashVerificationToken }))

import { acceptMembershipInviteAction } from "@/app/auth/accept-membership/actions"

const GENERIC_ERROR = "Este enlace no es válido, ya se usó o ya expiró."

describe("acceptMembershipInviteAction (D21)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hashVerificationToken.mockReturnValue("hashed-token")
  })

  // D21's load-bearing binding: the session cookie's own userId is what the
  // RPC checks against the invite's intended_user_id -- never anything the
  // client could supply, so a different authenticated user with the same
  // link cannot accept on someone else's behalf.
  it("supplies p_user_id from the session alone, never from the token or the caller", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "member-1", email: "socio@correo.com" })
    const rpc = vi.fn().mockResolvedValue({ data: { ok: true, store_id: "store-1" }, error: null })
    getServiceEcommerceClient.mockReturnValue({ rpc })

    const result = await acceptMembershipInviteAction("plaintext-token")

    expect(result).toEqual({ success: true })
    expect(rpc).toHaveBeenCalledWith("accept_membership_invite", {
      p_user_id: "member-1",
      p_token_hash: "hashed-token",
    })
  })

  it("refuses without a session instead of ever calling the RPC", async () => {
    resolveServerAuthSession.mockResolvedValue(null)

    const result = await acceptMembershipInviteAction("plaintext-token")

    expect(result).toEqual({ success: false, error: "Inicia sesión para aceptar esta invitación." })
    expect(getServiceEcommerceClient).not.toHaveBeenCalled()
  })

  // No enumeration (D24's posture, extended to the intended-user check): a
  // wrong-person rejection and an unknown/expired token collapse to the
  // exact same generic message here.
  it("collapses every RPC rejection reason to the same generic message", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "other-1", email: "otro@correo.com" })
    const rpc = vi.fn().mockResolvedValue({ data: { ok: false, reason: "invalid_or_expired" }, error: null })
    getServiceEcommerceClient.mockReturnValue({ rpc })

    const result = await acceptMembershipInviteAction("plaintext-token")

    expect(result).toEqual({ success: false, error: GENERIC_ERROR })
  })

  it("reports the same generic message on an RPC-level error too", async () => {
    resolveServerAuthSession.mockResolvedValue({ userId: "member-1", email: "socio@correo.com" })
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } })
    getServiceEcommerceClient.mockReturnValue({ rpc })

    const result = await acceptMembershipInviteAction("plaintext-token")

    expect(result).toEqual({ success: false, error: GENERIC_ERROR })
  })
})
