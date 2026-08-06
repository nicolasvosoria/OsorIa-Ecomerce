import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSupabaseAuthClient, clearInvitedPendingPassword, redirect } = vi.hoisted(() => ({
  getSupabaseAuthClient: vi.fn(),
  clearInvitedPendingPassword: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT")
  }),
}))

vi.mock("@/lib/supabase/admin-route-auth", () => ({ getSupabaseAuthClient }))
vi.mock("@/lib/auth/platform-identity-invites", () => ({ clearInvitedPendingPassword }))
vi.mock("next/navigation", () => ({ redirect }))

import { completeInviteSetup } from "@/app/auth/accept-invite/actions"

function mockSession(userId: string | null) {
  getSupabaseAuthClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  })
}

// D22's completion path: clearing the flag is the ONLY way an invited
// session escapes the global restriction, so it must be gated on the
// session cookie's own userId, never anything the client asserts.
describe("completeInviteSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })
  })

  it("clears the invited-pending flag for the session user, then forwards into the admin", async () => {
    mockSession("invited-uid")
    clearInvitedPendingPassword.mockResolvedValue(true)

    await expect(completeInviteSetup()).rejects.toThrow("NEXT_REDIRECT")

    expect(clearInvitedPendingPassword).toHaveBeenCalledWith("invited-uid")
    expect(redirect).toHaveBeenCalledWith("/admin")
  })

  it("refuses without a session instead of clearing anyone's flag", async () => {
    mockSession(null)

    const result = await completeInviteSetup()

    expect(result).toEqual({
      success: false,
      error: "Tu sesión expiró. Vuelve a abrir el enlace de invitación.",
    })
    expect(clearInvitedPendingPassword).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("does not enter the admin when clearing the flag fails", async () => {
    mockSession("invited-uid")
    clearInvitedPendingPassword.mockResolvedValue(false)

    const result = await completeInviteSetup()

    expect(result).toEqual({
      success: false,
      error: "No se pudo completar la invitación. Intenta de nuevo.",
    })
    expect(redirect).not.toHaveBeenCalled()
  })
})
