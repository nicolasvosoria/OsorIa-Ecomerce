"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import {
  authorizeActiveStoreAdmin,
  authorizeSuperAdmin,
} from "@/lib/supabase/active-store"

const UPDATE_ERROR_MESSAGE = "No se pudo actualizar la publicación de la tienda"

// The dueño publishes the store he currently manages (D13: `is_public` is the
// publication flag, born `false`). `storeId` always comes from the active-store
// gate, never from the client — mirrors `setActiveStore` not trusting input for
// authority.
export async function setActiveStorePublication(isPublic: boolean): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const result = await updateStorePublication(supabase, storeId, isPublic)
  if (!result.success) {
    return result
  }

  revalidatePath("/admin", "layout")
  return { success: true }
}

// The super_admin toggles publication for an arbitrary tenant from the platform
// console (Plan 12: publishing is lifecycle/platform, not content), so unlike
// the dueño action above, `storeId` is explicit client input — the caller
// legitimately manages any store, not just the active one.
export async function setTenantPublication(
  storeId: string,
  isPublic: boolean,
): Promise<AdminActionResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const result = await updateStorePublication(authorization.supabase, storeId, isPublic)
  if (!result.success) {
    return result
  }

  revalidatePath("/admin/stores")
  return { success: true }
}

// The single raw update both actions share once each has independently done its
// own gate and resolved its own storeId. Never call this without a gate above it.
async function updateStorePublication(
  supabase: any,
  storeId: string,
  isPublic: boolean,
): Promise<AdminActionResult> {
  const { error } = await supabase
    .from(ECOMMERCE_TABLES.stores)
    .update({ is_public: isPublic })
    .eq("id", storeId)

  if (error) {
    console.error("[Store Publication] Error al actualizar is_public:", error)
    return { success: false, error: UPDATE_ERROR_MESSAGE }
  }

  return { success: true }
}
