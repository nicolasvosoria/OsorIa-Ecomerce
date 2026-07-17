import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeSuperAdmin, setUserGlobalRole, revalidatePath } = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  setUserGlobalRole: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/memberships-api", () => ({
  setUserGlobalRole,
  grantSupportMembership: vi.fn(),
  resetOwnerCredential: vi.fn(),
}))
vi.mock("@/lib/supabase/stores-admin-api", () => ({ createTenant: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { setUserGlobalRoleAction } from "@/app/(platform)/admin/stores/actions"

const SERVICE = { marker: "service-client" }
const SUPER_GRANT = { supabase: SERVICE, userId: "super-1" }
const DENIAL = { error: "Acceso denegado", status: 403 as const }

describe("setUserGlobalRoleAction (platform console, super_admin gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeSuperAdmin.mockResolvedValue(SUPER_GRANT)
    setUserGlobalRole.mockResolvedValue({ success: true })
  })

  it("sets the role through the super_admin gate and refreshes the console users page", async () => {
    const result = await setUserGlobalRoleAction("user-9", "super_admin")

    expect(result).toEqual({ success: true })
    expect(authorizeSuperAdmin).toHaveBeenCalledTimes(1)
    expect(setUserGlobalRole).toHaveBeenCalledWith("user-9", "super_admin", SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/stores/users")
  })

  it("refuses to set a global role when the super_admin gate denies", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await setUserGlobalRoleAction("user-9", "super_admin")

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(setUserGlobalRole).not.toHaveBeenCalled()
  })

  // The global role is binary: any store role fails the whitelist.
  it.each(["owner", "admin"])("rejects the global role %s outside the whitelist", async (role) => {
    const result = await setUserGlobalRoleAction("user-9", role)

    expect(result).toEqual({ success: false, error: "Rol no válido" })
    expect(setUserGlobalRole).not.toHaveBeenCalled()
  })

  it("blocks a super_admin from demoting themselves", async () => {
    const result = await setUserGlobalRoleAction("super-1", "user")

    expect(result).toEqual({
      success: false,
      error: "No puedes quitarte a ti mismo el rol de super_admin",
    })
    expect(setUserGlobalRole).not.toHaveBeenCalled()
  })

  it("lets a super_admin re-affirm their own super_admin role", async () => {
    const result = await setUserGlobalRoleAction("super-1", "super_admin")

    expect(result).toEqual({ success: true })
    expect(setUserGlobalRole).toHaveBeenCalledWith("super-1", "super_admin", SERVICE)
  })
})
