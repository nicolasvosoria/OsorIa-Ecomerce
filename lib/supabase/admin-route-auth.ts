import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { isSuperAdminRole } from "@/lib/memberships/roles";
import { ECOMMERCE_TABLES } from "./contract";

export type AdminAuthDenial = {
  error: string;
  status: 401 | 403 | 500;
  diagnostics?: AdminAuthDiagnostics;
};

type AdminRouteAuthResult = { userId: string } | AdminAuthDenial;

type AdminAuthDiagnostics = {
  bearerPresent: boolean;
  cookieAuthUserExists: boolean;
  candidateUserIds: string[];
  profileQuery: {
    schema: "ecommerce";
    table: "user_profiles";
  };
  profileError?: {
    code?: string;
    message?: string;
    hint?: string;
  };
};

type AuthenticatedUser = {
  id: string;
};

type AuthResolution = {
  users: AuthenticatedUser[];
  bearerPresent: boolean;
  cookieAuthUserExists: boolean;
};

type PermissionError = {
  code?: string;
  message?: string;
  hint?: string;
};

type CandidateAuthorization =
  | { authorized: boolean }
  | { error: PermissionError };

export async function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {}
      },
    },
  });
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isAdminDebugEnabled(request: NextRequest) {
  return request.headers.get("x-osoria-admin-debug") === "1";
}

function buildDiagnostics(
  authResolution: AuthResolution,
  profileError?: {
    code?: string;
    message?: string;
    hint?: string;
  } | null,
): AdminAuthDiagnostics {
  return {
    bearerPresent: authResolution.bearerPresent,
    cookieAuthUserExists: authResolution.cookieAuthUserExists,
    candidateUserIds: authResolution.users.map((user) => user.id),
    profileQuery: {
      schema: "ecommerce",
      table: "user_profiles",
    },
    ...(profileError
      ? {
          profileError: {
            code: profileError.code,
            message: profileError.message,
            ...(profileError.hint ? { hint: profileError.hint } : {}),
          },
        }
      : {}),
  };
}

async function getAuthenticatedUsers(
  request: NextRequest,
  authSupabase: any,
): Promise<AuthResolution> {
  const accessToken = getBearerToken(request);
  const authRequests = [authSupabase.auth.getUser()];

  if (accessToken) {
    authRequests.unshift(authSupabase.auth.getUser(accessToken));
  }

  const authResults = await Promise.all(authRequests);
  const users = new Map<string, AuthenticatedUser>();
  const cookieAuthUser = authResults.at(-1)?.data?.user;

  for (const result of authResults) {
    const user = result.data?.user;
    if (user?.id) {
      users.set(user.id, { id: user.id });
    }
  }

  return {
    users: [...users.values()],
    bearerPresent: Boolean(accessToken),
    cookieAuthUserExists: Boolean(cookieAuthUser?.id),
  };
}

function deniedResult(
  status: 401 | 403,
  authResolution: AuthResolution,
  debugEnabled: boolean,
): AdminRouteAuthResult {
  return {
    error: "Acceso denegado",
    status,
    ...(debugEnabled ? { diagnostics: buildDiagnostics(authResolution) } : {}),
  };
}

async function authorizeAnyCandidate(
  request: NextRequest,
  authorizeCandidate: (userId: string) => Promise<CandidateAuthorization>,
): Promise<AdminRouteAuthResult> {
  const debugEnabled = isAdminDebugEnabled(request);
  const authSupabase = await getSupabaseAuthClient();
  if (!authSupabase) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const authResolution = await getAuthenticatedUsers(request, authSupabase);
  if (authResolution.users.length === 0) {
    return deniedResult(401, authResolution, debugEnabled);
  }

  for (const user of authResolution.users) {
    const result = await authorizeCandidate(user.id);

    if ("error" in result) {
      return {
        error: "Error verificando permisos",
        status: 500,
        ...(debugEnabled
          ? { diagnostics: buildDiagnostics(authResolution, result.error) }
          : {}),
      };
    }

    if (result.authorized) {
      return { userId: user.id };
    }
  }

  return deniedResult(403, authResolution, debugEnabled);
}

// Per-store admin gate: authorizes if any authenticated identity (cookie or
// preview bearer) can manage the trusted target store. The store id comes from
// the request host, never the mutable `store_id` cookie.
export function requireAdminUser(
  request: NextRequest,
  serviceSupabase: any,
  targetStoreId: string,
): Promise<AdminRouteAuthResult> {
  return authorizeAnyCandidate(request, async (userId) => {
    const { data, error } = await serviceSupabase.rpc(
      "can_user_manage_store",
      { p_user_id: userId, p_store_id: targetStoreId },
    );

    if (error) {
      return {
        error: { code: error.code, message: error.message, hint: error.hint },
      };
    }

    return { authorized: data === true };
  });
}

// Global gate for cross-store routes: only super_admin, never store-scoped roles.
export function requireSuperAdmin(
  request: NextRequest,
  serviceSupabase: any,
): Promise<AdminRouteAuthResult> {
  return authorizeAnyCandidate(request, async (userId) => {
    const { data: profile, error: profileError } = await serviceSupabase
      .from(ECOMMERCE_TABLES.userProfiles)
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      return {
        error: {
          code: profileError.code,
          message: profileError.message,
          hint: profileError.hint,
        },
      };
    }

    return { authorized: isSuperAdminRole(profile?.role) };
  });
}
