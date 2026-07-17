"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import {
  updateTenantSettingsSchema,
  type UpdateTenantSettingsValues,
} from "@/lib/stores/schemas"
import { authorizeSuperAdmin } from "@/lib/supabase/active-store"
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { getTenantById } from "@/lib/supabase/stores-admin-api"

const STORES_PATH = "/admin/stores"
const TENANT_NOT_FOUND_ERROR = "Tienda no encontrada"
const SUBDOMAIN_MISMATCH_ERROR = "El subdominio no coincide"

function detailPath(storeId: string): string {
  return `${STORES_PATH}/${storeId}`
}

// D7(a): suspending/reactivating only flips is_active — isStoreLive (proxy.ts)
// ANDs it with is_public, so a suspended store's domain falls to
// /store-inactive while its /admin journey paths stay reachable for the team.
export async function setTenantActive(
  storeId: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const result = await updateStoreFields(
    authorization.supabase,
    storeId,
    { is_active: isActive },
    "No se pudo actualizar el estado de la tienda",
  )
  if (result.success) {
    revalidatePath(STORES_PATH)
    revalidatePath(detailPath(storeId))
  }

  return result
}

// D7(b): only store_name/currency_code are editable — the subdomain is routing
// identity and never appears here. The action re-validates with the same
// schema the client form uses, since a server action is callable directly.
export async function updateTenantSettings(
  storeId: string,
  input: UpdateTenantSettingsValues,
): Promise<AdminActionResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const parsed = updateTenantSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const result = await updateStoreFields(
    authorization.supabase,
    storeId,
    { store_name: parsed.data.storeName, currency_code: parsed.data.currencyCode },
    "No se pudo actualizar la tienda",
  )
  if (result.success) {
    revalidatePath(STORES_PATH)
    revalidatePath(detailPath(storeId))
  }

  return result
}

// D7(c): soft delete only — deleted_at is the tombstone every tenant query
// already filters (listTenants, getTenantById). The subdomain the operator
// types is the strong-confirmation gate; the client's own check is only UX, so
// this re-validates it against the freshly-fetched row. Re-fetching via
// getTenantById also rejects a storeId that's missing OR already deleted,
// since that lookup applies the same deleted_at filter.
export async function softDeleteTenant(
  storeId: string,
  confirmSubdomain: string,
): Promise<AdminActionResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const tenant = await getTenantById(storeId)
  if (!tenant) {
    return { success: false, error: TENANT_NOT_FOUND_ERROR }
  }
  if (confirmSubdomain !== tenant.subdomain) {
    return { success: false, error: SUBDOMAIN_MISMATCH_ERROR }
  }

  const result = await updateStoreFields(
    authorization.supabase,
    storeId,
    { deleted_at: new Date().toISOString() },
    "No se pudo eliminar la tienda",
  )
  if (result.success) {
    revalidatePath(STORES_PATH)
    revalidatePath(detailPath(storeId))
  }

  return result
}

// The raw update all three actions above share, once each has independently
// done its own gate (and, for delete, its own confirmation check). Mirrors
// updateStorePublication's role in store-publication.ts — never call this
// without a gate above it.
async function updateStoreFields(
  supabase: any,
  storeId: string,
  fields: Record<string, unknown>,
  failureMessage: string,
): Promise<AdminActionResult> {
  const { error } = await supabase.from(ECOMMERCE_TABLES.stores).update(fields).eq("id", storeId)

  if (error) {
    console.error("[Tenant Lifecycle] Error al actualizar la tienda:", error)
    return { success: false, error: failureMessage }
  }

  return { success: true }
}
