"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  ACTIVE_STORE_COOKIE,
  cookieOptions,
  signActiveStore,
} from "@/lib/admin/active-store-cookie";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { checkCanManageStore } from "@/lib/supabase/active-store";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-route-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/admin-store";

export async function setActiveStore(storeId: string): Promise<AdminActionResult> {
  const userId = await resolveAuthenticatedUserId();
  if ("error" in userId) {
    return { success: false, error: userId.error };
  }

  const authorization = await checkStoreIsManageable(userId.userId, storeId);
  if (!authorization.success) {
    return authorization;
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, signActiveStore(storeId), cookieOptions);

  revalidatePath("/admin", "layout");
  return { success: true };
}

async function resolveAuthenticatedUserId(): Promise<{ userId: string } | { error: string }> {
  const authClient = await getSupabaseAuthClient();
  if (!authClient) {
    return { error: "Supabase no configurado" };
  }

  const { data } = await authClient.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) {
    return { error: "Acceso denegado" };
  }

  return { userId };
}

async function checkStoreIsManageable(
  userId: string,
  storeId: string,
): Promise<AdminActionResult> {
  const service = getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  const authorization = await checkCanManageStore(service, userId, storeId);
  if ("error" in authorization) {
    return { success: false, error: authorization.error.error };
  }

  if (!authorization.authorized) {
    return { success: false, error: "Acceso denegado" };
  }

  return { success: true };
}
