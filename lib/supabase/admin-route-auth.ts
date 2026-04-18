import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

type AdminRouteAuthResult =
  | { userId: string }
  | { error: string; status: 401 | 403 | 500 };

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

export async function requireAdminUser(
  request: NextRequest,
  serviceSupabase: any,
): Promise<AdminRouteAuthResult> {
  const authSupabase = await getSupabaseAuthClient();
  if (!authSupabase) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const accessToken = getBearerToken(request);
  const {
    data: { user },
    error: authError,
  } = accessToken
    ? await authSupabase.auth.getUser(accessToken)
    : await authSupabase.auth.getUser();

  if (authError || !user) {
    return { error: "Acceso denegado", status: 401 };
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "Acceso denegado", status: 403 };
  }

  return { userId: user.id };
}
