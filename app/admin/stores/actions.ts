"use server"

import { revalidatePath } from "next/cache"

import { authorizeSuperAdmin } from "@/lib/supabase/active-store"
import { createTenant, type CreateTenantResult } from "@/lib/supabase/stores-admin-api"
import type { CreateStoreFormValues } from "@/lib/stores/schemas"

const STORES_PATH = "/admin/stores"

// Provisioning a tenant is platform-tier, not per-store, so it gates on the
// global super_admin authority — the active-store gate could never grant it.
export async function createTenantAction(
  input: CreateStoreFormValues,
): Promise<CreateTenantResult> {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const result = await createTenant(input, authorization.supabase)
  if (result.success) {
    revalidatePath(STORES_PATH)
  }

  return result
}
