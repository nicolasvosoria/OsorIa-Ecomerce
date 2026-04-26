import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ECOMMERCE_TABLES } from "./contract";

type AdminRouteAuthResult =
  | { userId: string }
  | {
      error: string;
      status: 401 | 403 | 500;
      diagnostics?: AdminAuthDiagnostics;
    };

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

async function getSupabaseAuthClient() {
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

export async function requireAdminUser(
  request: NextRequest,
  serviceSupabase: any,
): Promise<AdminRouteAuthResult> {
  const debugEnabled = isAdminDebugEnabled(request);
  const authSupabase = await getSupabaseAuthClient();
  if (!authSupabase) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const authResolution = await getAuthenticatedUsers(request, authSupabase);
  if (authResolution.users.length === 0) {
    return {
      error: "Acceso denegado",
      status: 401,
      ...(debugEnabled
        ? { diagnostics: buildDiagnostics(authResolution) }
        : {}),
    };
  }

  for (const user of authResolution.users) {
    const { data: profile, error: profileError } = await serviceSupabase
      .from(ECOMMERCE_TABLES.userProfiles)
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return { userId: user.id };
    }

    if (profileError && profileError.code !== "PGRST116") {
      return {
        error: "Error verificando permisos",
        status: 500,
        ...(debugEnabled
          ? {
              diagnostics: buildDiagnostics(authResolution, {
                code: profileError.code,
                message: profileError.message,
                hint: profileError.hint,
              }),
            }
          : {}),
      };
    }
  }

  return {
    error: "Acceso denegado",
    status: 403,
    ...(debugEnabled ? { diagnostics: buildDiagnostics(authResolution) } : {}),
  };
}
