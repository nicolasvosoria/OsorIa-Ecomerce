"use server"

import { revalidatePath } from "next/cache"

import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import {
  addStoreMember,
  findUserIdByEmail,
  removeMembership,
  upsertMembershipRole,
  type AddStoreMemberResult,
  type MembershipResult,
} from "@/lib/supabase/memberships-api"
import { isStoreRoleName } from "@/lib/memberships/roles"

const USERS_PATH = "/admin/users"
const SELF_ROLE_CHANGE_ERROR = "No puedes cambiar tu propio rol"

export async function addStoreMemberAction(
  email: string,
  roleName: string,
): Promise<AddStoreMemberResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  if (!isStoreRoleName(roleName)) {
    return { success: false, error: "Rol no válido" }
  }

  const { supabase, storeId, userId } = authorization

  // Adding an existing member re-assigns their role, so an unguarded email is a
  // second, silent path into updateMembershipRoleAction's self-role change.
  try {
    if ((await findUserIdByEmail(email, supabase)) === userId) {
      return { success: false, error: SELF_ROLE_CHANGE_ERROR }
    }
  } catch (error) {
    console.error("[Users] Error al resolver el correo del miembro:", error)
    return { success: false, error: "No se pudo verificar el correo del miembro" }
  }

  const result = await addStoreMember(storeId, userId, email, roleName, supabase)
  if (result.success) {
    revalidatePath(USERS_PATH)
  }

  return result
}

export async function updateMembershipRoleAction(
  userId: string,
  roleName: string,
): Promise<MembershipResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  if (!isStoreRoleName(roleName)) {
    return { success: false, error: "Rol no válido" }
  }

  if (userId === authorization.userId) {
    return { success: false, error: SELF_ROLE_CHANGE_ERROR }
  }

  const { supabase, storeId } = authorization
  const result = await upsertMembershipRole(storeId, userId, roleName, supabase)
  if (result.success) {
    revalidatePath(USERS_PATH)
  }

  return result
}

export async function removeMembershipAction(userId: string): Promise<MembershipResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  if (userId === authorization.userId) {
    return { success: false, error: "No puedes quitarte a ti mismo del equipo" }
  }

  const { supabase, storeId } = authorization
  const result = await removeMembership(storeId, userId, supabase)
  if (result.success) {
    revalidatePath(USERS_PATH)
  }

  return result
}
