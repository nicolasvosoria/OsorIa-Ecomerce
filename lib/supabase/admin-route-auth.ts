import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

type AdminRouteAuthResult =
  | { userId: string }
  | { error: string; status: 401 | 403 | 500 };

type AuthenticatedUser = {
  id: string;
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

async function getAuthenticatedUsers(
  request: NextRequest,
  authSupabase: any,
): Promise<AuthenticatedUser[]> {
  const accessToken = getBearerToken(request);
  const authRequests = [authSupabase.auth.getUser()];

  if (accessToken) {
    authRequests.unshift(authSupabase.auth.getUser(accessToken));
  }

  const authResults = await Promise.all(authRequests);
  const users = new Map<string, AuthenticatedUser>();

  for (const result of authResults) {
    const user = result.data?.user;
    if (user?.id) {
      users.set(user.id, { id: user.id });
    }
  }

  return [...users.values()];
}

export async function requireAdminUser(
  request: NextRequest,
  serviceSupabase: any,
): Promise<AdminRouteAuthResult> {
  const authSupabase = await getSupabaseAuthClient();
  if (!authSupabase) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const users = await getAuthenticatedUsers(request, authSupabase);
  if (users.length === 0) {
    return { error: "Acceso denegado", status: 401 };
  }

  for (const user of users) {
    const { data: profile, error: profileError } = await serviceSupabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return { userId: user.id };
    }

    if (profileError && profileError.code !== "PGRST116") {
      return { error: "Error verificando permisos", status: 500 };
    }
  }

  return { error: "Acceso denegado", status: 403 };
}
