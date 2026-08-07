"use server"

import { revalidatePath } from "next/cache"

import { authorizeSuperAdmin } from "@/lib/supabase/active-store"
import {
  grantSupportMembership,
  resetOwnerCredential,
  setUserGlobalRole,
  type MembershipResult,
  type ResetOwnerCredentialResult,
} from "@/lib/supabase/memberships-api"
import { createTenant, type CreateTenantResult } from "@/lib/supabase/stores-admin-api"
import { isGlobalRoleName } from "@/lib/memberships/roles"
import type { CreateStoreFormValues } from "@/lib/stores/schemas"

const STORES_PATH = "/admin/stores"
const USERS_PATH = "/admin/stores/users"

// Provisioning a tenant is platform-tier, not per-store, so it gates on the
// global super_admin authority — the active-store gate could never grant it.
export async function createTenantAction(
  input: CreateStoreFormValues,
): Promise<CreateTenantResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const result = await createTenant(input, authorization.userId, authorization.supabase)
  if (result.success) {
    revalidatePath(STORES_PATH)
  }

  return result
}

// Support self-assignment (D2): the actor becomes a real, owner-visible member
// of the store — never a silent bypass. Entering the store stays a separate
// click (D3): this only makes "Entrar a tienda" possible.
export async function grantSelfSupportAccessAction(
  storeId: string,
): Promise<MembershipResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const result = await grantSupportMembership(
    storeId,
    authorization.userId,
    authorization.supabase,
  )
  if (result.success) {
    revalidatePath(STORES_PATH)
  }

  return result
}

// D7: support without entering the store — regenerates the owner's temporary
// password and re-arms the forced change. Takes only the storeId; the domain
// resolves the owner server-side, so a caller can never repoint the reset at an
// arbitrary platform account (#2347). Nothing rendered changes, so no revalidate.
export async function resetOwnerCredentialAction(
  storeId: string,
): Promise<ResetOwnerCredentialResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  return resetOwnerCredential(storeId, authorization.supabase)
}

// D8: editing user_profiles.role is whole-platform authority, so it lives in the
// console gated on super_admin — never the per-store admin screen. A super_admin
// cannot demote their own account, so the platform can never be left with no
// super_admin by a single self-edit.
export async function setUserGlobalRoleAction(
  userId: string,
  role: string,
): Promise<MembershipResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  if (!isGlobalRoleName(role)) {
    return { success: false, error: "Rol no válido" }
  }

  if (userId === authorization.userId && role !== "super_admin") {
    return { success: false, error: "No puedes quitarte a ti mismo el rol de super_admin" }
  }

  const result = await setUserGlobalRole(userId, role, authorization.supabase)
  if (result.success) {
    revalidatePath(USERS_PATH)
  }

  return result
}
