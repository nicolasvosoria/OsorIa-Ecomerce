import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { isInvitedPendingPasswordMetadata } from "@/lib/auth/invited-session-gate";
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
  // D22: carried alongside id so authorizeAnyCandidate can disqualify an
  // invited-pending candidate off this SAME getUser() result, with no
  // second call. See lib/auth/invited-session-gate.ts.
  appMetadata: Record<string, unknown> | null | undefined;
};

type AuthResolution = {
  users: AuthenticatedUser[];
  bearerPresent: boolean;
  cookieAuthUserExists: boolean;
};

export type PermissionError = {
  code?: string;
  message?: string;
  hint?: string;
};

// Shared user-facing message for a PermissionError surfaced by any gate below,
// so the string lives in one place even though the gates that return it don't
// share a call path.
export const PERMISSION_CHECK_ERROR_MESSAGE = "Error verificando permisos";

type CandidateAuthorization<TGrant> =
  | { authorized: true; grant: TGrant }
  | { authorized: false }
  | { error: PermissionError };

type AuthorizedCandidate<TGrant> = { userId: string; grant: TGrant };

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
      users.set(user.id, { id: user.id, appMetadata: user.app_metadata });
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
): AdminAuthDenial {
  return {
    error: "Acceso denegado",
    status,
    ...(debugEnabled ? { diagnostics: buildDiagnostics(authResolution) } : {}),
  };
}

// Runs a per-user authorization against every authenticated identity of the
// request (cookie session and preview bearer) and grants on the first one that
// passes, so a preview token keeps working alongside a signed-in session.
//
// D22: this is the ONE place every authenticated Route Handler resolves
// identity through (authorizeStoreAdmin and requireSuperAdmin both call this),
// and proxy.ts's global invited-session gate never runs for `/api/*` (its
// matcher excludes the whole tree) -- so a candidate still mid invite-setup
// is disqualified right here, off the SAME getUser() result
// getAuthenticatedUsers already resolved, before it ever reaches
// authorizeCandidate. See lib/auth/invited-session-gate.ts for the shared
// predicate and the full rationale.
export async function authorizeAnyCandidate<TGrant>(
  request: NextRequest,
  authorizeCandidate: (userId: string) => Promise<CandidateAuthorization<TGrant>>,
): Promise<AuthorizedCandidate<TGrant> | AdminAuthDenial> {
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
    if (isInvitedPendingPasswordMetadata(user.appMetadata)) {
      continue;
    }

    const result = await authorizeCandidate(user.id);

    if ("error" in result) {
      return {
        error: PERMISSION_CHECK_ERROR_MESSAGE,
        status: 500,
        ...(debugEnabled
          ? { diagnostics: buildDiagnostics(authResolution, result.error) }
          : {}),
      };
    }

    if (result.authorized) {
      return { userId: user.id, grant: result.grant };
    }
  }

  return deniedResult(403, authResolution, debugEnabled);
}

// Global gate for cross-store routes: only super_admin, never store-scoped roles.
export async function requireSuperAdmin(
  request: NextRequest,
  serviceSupabase: any,
): Promise<AdminRouteAuthResult> {
  const candidate = await authorizeAnyCandidate<null>(request, async (userId) => {
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

    return isSuperAdminRole(profile?.role)
      ? { authorized: true, grant: null }
      : { authorized: false };
  });

  return "error" in candidate ? candidate : { userId: candidate.userId };
}
