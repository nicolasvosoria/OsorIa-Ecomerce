import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { ECOMMERCE_TABLES } from "./contract";

export type AdminAccessResult =
  | { status: "admin"; userId: string }
  | { status: "guest"; reason: "no_user" | "auth_error" | "supabase_not_configured" }
  | { status: "non_admin"; userId: string; reason?: "missing_profile" | "role_mismatch" }
  | { status: "error"; userId?: string; reason: "supabase_not_configured" | "profile_lookup_failed" };

type AuthenticatedUser = {
  id: string;
};

function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function normalizeSafeAdminPath(candidate: string | null | undefined) {
  if (!candidate) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate, "http://osoria.local");
  } catch {
    return null;
  }

  if (parsed.origin !== "http://osoria.local") {
    return null;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return null;
  }

  const pathname = parsed.pathname;
  if (!isAdminRoute(pathname)) {
    return null;
  }

  if (pathname === "/auth/callback" || parsed.searchParams.has("admin_access")) {
    return null;
  }

  return `${pathname}${parsed.search}`;
}

function createRequestAuthClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll() {
        // Proxy admin access checks are read-only. Any auth cookie refresh remains
        // owned by Supabase/browser flows outside this PR slice.
      },
    },
  });
}

async function getCurrentUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authSupabase = createRequestAuthClient(request);
  if (!authSupabase) {
    return null;
  }

  const { data, error } = await authSupabase.auth.getUser();
  if (error || !data.user?.id) {
    return null;
  }

  return { id: data.user.id };
}

async function fetchProfileRole(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { kind: "error" as const };
  }

  const params = new URLSearchParams({
    id: `eq.${userId}`,
    select: "role",
    limit: "1",
  });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${ECOMMERCE_TABLES.userProfiles}?${params.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Accept-Profile": "ecommerce",
      },
      signal: AbortSignal.timeout(5000),
    },
  );

  if (!response.ok) {
    return { kind: "error" as const };
  }

  const data = await response.json();
  const role = Array.isArray(data) && data[0]?.role ? String(data[0].role) : null;

  return { kind: "role" as const, role };
}

export async function resolveAdminAccess(request: NextRequest): Promise<AdminAccessResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { status: "guest", reason: "supabase_not_configured" };
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return { status: "guest", reason: "no_user" };
  }

  try {
    const profile = await fetchProfileRole(user.id);
    if (profile.kind === "error") {
      return { status: "error", userId: user.id, reason: "profile_lookup_failed" };
    }

    if (profile.role === "admin") {
      return { status: "admin", userId: user.id };
    }

    return profile.role
      ? { status: "non_admin", userId: user.id }
      : { status: "non_admin", userId: user.id, reason: "missing_profile" };
  } catch {
    return { status: "error", userId: user.id, reason: "profile_lookup_failed" };
  }
}
