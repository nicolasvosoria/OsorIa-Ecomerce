import { cookies, headers } from "next/headers";
import {
  ACTIVE_STORE_COOKIE,
  verifyActiveStore,
} from "@/lib/admin/active-store-cookie";
import { isSuperAdminRole } from "@/lib/memberships/roles";
import {
  getSupabaseAuthClient,
  PERMISSION_CHECK_ERROR_MESSAGE,
  type AdminAuthDenial,
  type PermissionError,
} from "./admin-route-auth";
import {
  getSupabaseServiceClient,
  resolveTrustedStoreIdFromHost,
} from "./admin-store";
import { ECOMMERCE_TABLES } from "./contract";

export type ActiveStoreAdminGrant = {
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

type StoreAuthorization = { authorized: boolean } | { error: PermissionError };

type AuthenticatedServiceSession = { service: any; userId: string };

type ActiveStoreQuery = {
  service: any;
  userId: string;
  activeStoreCookie: string | undefined | null;
  hostHeader: string | null | undefined;
};

export type ActiveStoreResolution =
  | { storeId: string }
  | { unauthorized: true }
  | { error: PermissionError };

// Shared preamble of both gates below: SSR-auth the cookie session and hand back
// the service client. Authenticating only — neither store membership nor global
// role is decided here.
async function authenticateServiceSession(): Promise<
  AuthenticatedServiceSession | AdminAuthDenial
> {
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

  return { service, userId };
}

// Per-store admin gate for RSC/server actions: authorizes the current cookie
// session against the active store it resolves to.
export async function authorizeActiveStoreAdmin(): Promise<ActiveStoreAdminAuthorization> {
  const session = await authenticateServiceSession();
  if ("error" in session) {
    return session;
  }

  const { service, userId } = session;
  const cookieStore = await cookies();
  const resolution = await resolveActiveStoreId({
    service,
    userId,
    activeStoreCookie: cookieStore.get(ACTIVE_STORE_COOKIE)?.value,
    hostHeader: (await headers()).get("host"),
  });

  if ("error" in resolution) {
    return { error: PERMISSION_CHECK_ERROR_MESSAGE, status: 500 };
  }
  if ("unauthorized" in resolution) {
    return { error: "Acceso denegado", status: 403 };
  }

  return { supabase: service, storeId: resolution.storeId, userId };
}

// Global gate for cross-store authority (editing user_profiles.role): SSR-auth
// the cookie session, then confirm GLOBAL super_admin against user_profiles.role.
// Mirrors requireSuperAdmin; never store-scoped. This is the only authority the
// global-role actions trust — the per-store gate cannot grant it.
export async function authorizeSuperAdmin(): Promise<SuperAdminAuthorization> {
  const session = await authenticateServiceSession();
  if ("error" in session) {
    return session;
  }

  const { service, userId } = session;

  const { data: profile, error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .select("role")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[ActiveStore] Error al leer el rol global del usuario:", error);
    return { error: PERMISSION_CHECK_ERROR_MESSAGE, status: 500 };
  }

  if (!isSuperAdminRole(profile?.role)) {
    return { error: "Acceso denegado", status: 403 };
  }

  return { supabase: service, userId };
}

// The single store-resolution rule behind every per-store admin gate, whether it
// runs in RSC (cookies()) or on an API route (NextRequest) — callers hand over
// the already-read cookie value and host header so neither world owns the rule.
// The active-store cookie is signed with the store id alone and carries no user,
// so its signature only proves this server issued it: authority always comes
// from re-checking the resolved store against `userId` with can_user_manage_store.
// A missing, tampered, or unmanageable cookie falls back to the host store — so
// does a candidate check that errors calling can_user_manage_store: that error
// is not returned here, only logged in checkCanManageStore, and resolution
// continues against the host store's own check. Never falls back to the raw
// cookie value.
export async function resolveActiveStoreId({
  service,
  userId,
  activeStoreCookie,
  hostHeader,
}: ActiveStoreQuery): Promise<ActiveStoreResolution> {
  const candidate = verifyActiveStore(activeStoreCookie);
  if (candidate) {
    const candidateCheck = await checkCanManageStore(service, userId, candidate);
    if ("authorized" in candidateCheck && candidateCheck.authorized) {
      return { storeId: candidate };
    }
  }

  const hostStore = await resolveTrustedStoreIdFromHost(hostHeader, service);
  const hostCheck = await checkCanManageStore(service, userId, hostStore);
  if ("error" in hostCheck) {
    return hostCheck;
  }

  return hostCheck.authorized ? { storeId: hostStore } : { unauthorized: true };
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
    return {
      error: { code: error.code, message: error.message, hint: error.hint },
    };
  }

  return { authorized: data === true };
}
