import { cookies, headers } from "next/headers";
import {
  ACTIVE_STORE_COOKIE,
  verifyActiveStore,
} from "@/lib/admin/active-store-cookie";
import { isSuperAdminRole } from "@/lib/memberships/roles";
import {
  getSupabaseAuthClient,
  type AdminAuthDenial,
} from "./admin-route-auth";
import {
  getSupabaseServiceClient,
  resolveTrustedStoreIdFromHost,
} from "./admin-store";
import { ECOMMERCE_TABLES } from "./contract";

type ActiveStoreAdminGrant = {
  supabase: any;
  storeId: string;
  userId: string;
};

export type ActiveStoreAdminAuthorization =
  | ActiveStoreAdminGrant
  | AdminAuthDenial;

type SuperAdminGrant = {
  supabase: any;
  userId: string;
};

export type SuperAdminAuthorization = SuperAdminGrant | AdminAuthDenial;

type StoreAuthorization = { authorized: boolean } | { error: AdminAuthDenial };

// Per-store admin gate for RSC/server actions: authorizes the current cookie
// session against its active store cookie, then the request host. The cookie is
// HMAC-verified and re-checked with can_user_manage_store on every call; any
// failure silently falls back to host, never to the raw cookie value.
export async function authorizeActiveStoreAdmin(): Promise<ActiveStoreAdminAuthorization> {
  const authClient = await getSupabaseAuthClient();
  if (!authClient) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const { data } = await authClient.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) {
    return { error: "Acceso denegado", status: 401 };
  }

  const service = getSupabaseServiceClient();
  if (!service) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const cookieStore = await cookies();
  const candidate = verifyActiveStore(cookieStore.get(ACTIVE_STORE_COOKIE)?.value);
  if (candidate) {
    const candidateCheck = await checkCanManageStore(service, userId, candidate);
    if ("authorized" in candidateCheck && candidateCheck.authorized) {
      return { supabase: service, storeId: candidate, userId };
    }
  }

  const hostHeader = (await headers()).get("host");
  const hostStore = await resolveTrustedStoreIdFromHost(hostHeader, service);
  const hostCheck = await checkCanManageStore(service, userId, hostStore);
  if ("error" in hostCheck) {
    return hostCheck.error;
  }
  if (!hostCheck.authorized) {
    return { error: "Acceso denegado", status: 403 };
  }

  return { supabase: service, storeId: hostStore, userId };
}

// Global gate for cross-store authority (editing user_profiles.role): SSR-auth
// the cookie session, then confirm GLOBAL super_admin against user_profiles.role.
// Mirrors requireSuperAdmin; never store-scoped. This is the only authority the
// global-role actions trust — the per-store gate cannot grant it.
export async function authorizeSuperAdmin(): Promise<SuperAdminAuthorization> {
  const authClient = await getSupabaseAuthClient();
  if (!authClient) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const { data } = await authClient.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) {
    return { error: "Acceso denegado", status: 401 };
  }

  const service = getSupabaseServiceClient();
  if (!service) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const { data: profile, error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .select("role")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[ActiveStore] Error al leer el rol global del usuario:", error);
    return { error: "Error verificando permisos", status: 500 };
  }

  if (!isSuperAdminRole(profile?.role)) {
    return { error: "Acceso denegado", status: 403 };
  }

  return { supabase: service, userId };
}

export async function checkCanManageStore(
  service: any,
  userId: string,
  storeId: string,
): Promise<StoreAuthorization> {
  const { data, error } = await service.rpc("can_user_manage_store", {
    p_user_id: userId,
    p_store_id: storeId,
  });

  if (error) {
    console.error("[ActiveStore] Error al verificar can_user_manage_store:", error);
    return { error: { error: "Error verificando permisos", status: 500 } };
  }

  return { authorized: data === true };
}
