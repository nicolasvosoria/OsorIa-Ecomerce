import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSupabaseAuthClient, clearMustChangePassword, redirect } = vi.hoisted(() => ({
  getSupabaseAuthClient: vi.fn(),
  clearMustChangePassword: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT")
  }),
}))

vi.mock("@/lib/supabase/admin-route-auth", () => ({ getSupabaseAuthClient }))
vi.mock("@/lib/supabase/memberships-api", () => ({ clearMustChangePassword }))
vi.mock("next/navigation", () => ({ redirect }))

import { completeForcedPasswordChange } from "@/app/auth/force-password-change/actions"

function mockSession(userId: string | null) {
  getSupabaseAuthClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  })
}

describe("completeForcedPasswordChange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })
  })

  // The flag is cleared for the id resolved from the session cookie — the action
  // takes no argument, so a caller can never point it at someone else's profile.
  it("clears the flag for the session user, then forwards into the admin", async () => {
    mockSession("session-uid")
    clearMustChangePassword.mockResolvedValue({ success: true })

    await expect(completeForcedPasswordChange()).rejects.toThrow("NEXT_REDIRECT")

    expect(clearMustChangePassword).toHaveBeenCalledWith("session-uid")
    expect(redirect).toHaveBeenCalledWith("/admin")
  })

  it("refuses without a session instead of clearing anyone's flag", async () => {
    mockSession(null)

    const result = await completeForcedPasswordChange()

    expect(result).toEqual({ success: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." })
    expect(clearMustChangePassword).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("does not enter the admin when clearing the flag fails", async () => {
    mockSession("session-uid")
    clearMustChangePassword.mockResolvedValue({
      success: false,
      error: "No se pudo actualizar la contraseña: boom",
    })

    const result = await completeForcedPasswordChange()

    expect(result).toEqual({
      success: false,
      error: "No se pudo actualizar la contraseña: boom",
    })
    expect(redirect).not.toHaveBeenCalled()
  })
})
