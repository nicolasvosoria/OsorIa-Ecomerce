"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  ACTIVE_STORE_COOKIE,
  cookieOptions,
  signActiveStore,
} from "@/lib/admin/active-store-cookie";
import { checkCanManageStore } from "@/lib/supabase/active-store";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-route-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/admin-store";

export async function setActiveStore(storeId: string): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  await requireStoreIsManageable(userId, storeId);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, signActiveStore(storeId), cookieOptions);

  revalidatePath("/admin", "layout");
}

async function requireAuthenticatedUserId(): Promise<string> {
  const authClient = await getSupabaseAuthClient();
  if (!authClient) {
    throw new Error("Supabase no configurado");
  }

  const { data } = await authClient.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("Acceso denegado");
  }

  return userId;
}

async function requireStoreIsManageable(userId: string, storeId: string): Promise<void> {
  const service = getSupabaseServiceClient();
  if (!service) {
    throw new Error("Supabase no configurado");
  }

  const authorization = await checkCanManageStore(service, userId, storeId);
  if ("error" in authorization) {
    throw new Error(authorization.error.error, { cause: authorization.error });
  }

  if (!authorization.authorized) {
    throw new Error("Acceso denegado");
  }
}
