import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { ECOMMERCE_FUNCTIONS, ECOMMERCE_TABLES } from "./contract";
import { normalizeAuthReturnPath } from "@/lib/auth-return-intent";
import { canAccessAdmin } from "@/lib/memberships/roles";

export type AdminAccessResult =
  | { status: "admin"; userId: string }
  | { status: "guest"; reason: "no_user" | "auth_error" | "supabase_not_configured" }
  | { status: "non_admin"; userId: string; reason?: "missing_profile" | "role_mismatch" }
  | {
      status: "error";
      userId?: string;
      reason: "supabase_not_configured" | "profile_lookup_failed" | "store_access_lookup_failed";
    };

type AuthenticatedUser = {
  id: string;
};

export function normalizeSafeAdminPath(candidate: string | null | undefined) {
  return normalizeAuthReturnPath(candidate);
}

// Exported for lib/auth/invited-session-gate.ts (D22): the same read-only,
// cookie-scoped client this file already builds to resolve `/admin` access,
// reused instead of a second copy for the global invited-session check.
export function createRequestAuthClient(request: NextRequest) {
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

const SERVICE_LOOKUP_TIMEOUT_MS = 5000;

async function readWithServiceRole(resourcePath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return fetch(`${supabaseUrl}/rest/v1/${resourcePath}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Accept-Profile": "ecommerce",
    },
    signal: AbortSignal.timeout(SERVICE_LOOKUP_TIMEOUT_MS),
  });
}

async function fetchProfileRole(userId: string) {
  const params = new URLSearchParams({
    id: `eq.${userId}`,
    select: "role",
    limit: "1",
  });

  const response = await readWithServiceRole(`${ECOMMERCE_TABLES.userProfiles}?${params.toString()}`);
  if (!response?.ok) {
    return { kind: "error" as const };
  }

  const data = await response.json();
  const role = Array.isArray(data) && data[0]?.role ? String(data[0].role) : null;

  return { kind: "role" as const, role };
}

// ecommerce.user_manages_any_store is STABLE, so PostgREST exposes it over GET
// with its arguments in the query string, and GET selects the schema with
// Accept-Profile (Content-Profile would be the POST equivalent).
async function fetchManagesAnyStore(userId: string) {
  const params = new URLSearchParams({ p_user_id: userId });

  const response = await readWithServiceRole(
    `rpc/${ECOMMERCE_FUNCTIONS.userManagesAnyStore}?${params.toString()}`,
  );
  if (!response?.ok) {
    return { kind: "error" as const };
  }

  return { kind: "storeAccess" as const, managesAnyStore: (await response.json()) === true };
}

// Store-SCOPED authority for the proxy, the twin of resolveAdminAccess below:
// membership in THIS store, never "manages some store". ecommerce.
// can_user_manage_store is STABLE too, so it travels over GET like the
// store-agnostic function above. A lookup that fails denies: the caller can
// only fall back to the neutral page, so the cause is logged here.
export async function requesterManagesStore(
  request: NextRequest,
  storeId: string,
): Promise<boolean> {
  const user = await getCurrentUser(request);
  if (!user) {
    return false;
  }

  const params = new URLSearchParams({ p_user_id: user.id, p_store_id: storeId });

  try {
    const response = await readWithServiceRole(
      `rpc/${ECOMMERCE_FUNCTIONS.canUserManageStore}?${params.toString()}`,
    );

    if (!response?.ok) {
      console.error(
        "[AdminAccess] can_user_manage_store lookup failed:",
        response?.status ?? "supabase not configured",
      );
      return false;
    }

    return (await response.json()) === true;
  } catch (error) {
    console.error("[AdminAccess] can_user_manage_store lookup failed:", error);
    return false;
  }
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
    const [profile, storeAccess] = await Promise.all([
      fetchProfileRole(user.id),
      fetchManagesAnyStore(user.id),
    ]);

    if (profile.kind === "error") {
      return { status: "error", userId: user.id, reason: "profile_lookup_failed" };
    }

    if (storeAccess.kind === "error") {
      return { status: "error", userId: user.id, reason: "store_access_lookup_failed" };
    }

    if (canAccessAdmin({ globalRole: profile.role, managesAnyStore: storeAccess.managesAnyStore })) {
      return { status: "admin", userId: user.id };
    }

    return profile.role
      ? { status: "non_admin", userId: user.id }
      : { status: "non_admin", userId: user.id, reason: "missing_profile" };
  } catch {
    return { status: "error", userId: user.id, reason: "profile_lookup_failed" };
  }
}
