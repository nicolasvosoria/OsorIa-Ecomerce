import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeActiveStoreAdmin,
  addStoreMember,
  findUserIdByEmail,
  upsertMembershipRole,
  removeMembership,
  revalidatePath,
} = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  addStoreMember: vi.fn(),
  findUserIdByEmail: vi.fn(),
  upsertMembershipRole: vi.fn(),
  removeMembership: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/memberships-api", () => ({
  addStoreMember,
  findUserIdByEmail,
  upsertMembershipRole,
  removeMembership,
}))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  addStoreMemberAction,
  removeMembershipAction,
  updateMembershipRoleAction,
} from "@/app/admin/users/actions"

const SERVICE = { marker: "service-client" }
const STORE_GRANT = { supabase: SERVICE, storeId: "store-1", userId: "admin-1" }
const STORE_DENIAL = { error: "Acceso denegado", status: 403 as const }

describe("store membership actions (store gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(STORE_GRANT)
    addStoreMember.mockResolvedValue({ success: true })
    findUserIdByEmail.mockResolvedValue("member-2")
    upsertMembershipRole.mockResolvedValue({ success: true })
    removeMembership.mockResolvedValue({ success: true })
  })

  it("adds a member scoped to the active store with the service client", async () => {
    const result = await addStoreMemberAction("nuevo@correo.com", "admin")

    expect(result).toEqual({ success: true })
    expect(addStoreMember).toHaveBeenCalledWith("store-1", "nuevo@correo.com", "admin", SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
  })

  it("refuses to add a member when the store gate denies", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue(STORE_DENIAL)

    const result = await addStoreMemberAction("nuevo@correo.com", "admin")

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(addStoreMember).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects a store role outside the owner/admin whitelist", async () => {
    const result = await addStoreMemberAction("nuevo@correo.com", "super_admin")

    expect(result).toEqual({ success: false, error: "Rol no válido" })
    expect(addStoreMember).not.toHaveBeenCalled()
  })

  it("blocks an admin from re-adding their own email to change their own role", async () => {
    findUserIdByEmail.mockResolvedValue("admin-1")

    const result = await addStoreMemberAction("admin@correo.com", "owner")

    expect(result).toEqual({ success: false, error: "No puedes cambiar tu propio rol" })
    expect(addStoreMember).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses to add a member when the email lookup fails", async () => {
    findUserIdByEmail.mockRejectedValue(new Error("timeout"))

    const result = await addStoreMemberAction("nuevo@correo.com", "admin")

    expect(result).toEqual({
      success: false,
      error: "No se pudo verificar el correo del miembro",
    })
    expect(addStoreMember).not.toHaveBeenCalled()
  })

  it("updates another member's role scoped to the active store", async () => {
    const result = await updateMembershipRoleAction("member-2", "owner")

    expect(result).toEqual({ success: true })
    expect(upsertMembershipRole).toHaveBeenCalledWith("store-1", "member-2", "owner", SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
  })

  it("blocks an admin from changing their own store role", async () => {
    const result = await updateMembershipRoleAction("admin-1", "admin")

    expect(result).toEqual({ success: false, error: "No puedes cambiar tu propio rol" })
    expect(upsertMembershipRole).not.toHaveBeenCalled()
  })

  it("removes another member scoped to the active store", async () => {
    const result = await removeMembershipAction("member-2")

    expect(result).toEqual({ success: true })
    expect(removeMembership).toHaveBeenCalledWith("store-1", "member-2", SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
  })

  it("blocks an admin from removing themselves", async () => {
    const result = await removeMembershipAction("admin-1")

    expect(result).toEqual({ success: false, error: "No puedes quitarte a ti mismo del equipo" })
    expect(removeMembership).not.toHaveBeenCalled()
  })
})
