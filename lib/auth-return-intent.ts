import type { UserProfile } from "@/lib/types/user";

export const AUTH_CONFIRMATION_SUCCESS_PATH = "/auth/cuenta-confirmada";
export const ADMIN_ACCESS_DENIED_PATH = "/?admin_access=denied";

export type AuthReturnUser = Pick<UserProfile, "role"> | null | undefined;

function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function normalizeAuthReturnPath(candidate: string | null | undefined) {
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

export function getAuthReturnPath(params: Pick<URLSearchParams, "get">) {
  return normalizeAuthReturnPath(params.get("next") ?? params.get("redirect"));
}

export function resolvePostAuthDestination({
  returnPath,
  user,
  fallback = AUTH_CONFIRMATION_SUCCESS_PATH,
}: {
  returnPath: string | null | undefined;
  user: AuthReturnUser;
  fallback?: string;
}) {
  const safeReturnPath = normalizeAuthReturnPath(returnPath);
  if (!safeReturnPath) {
    return fallback;
  }

  if (user?.role === "admin") {
    return safeReturnPath;
  }

  return ADMIN_ACCESS_DENIED_PATH;
}
