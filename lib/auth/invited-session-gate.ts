import type { NextRequest } from "next/server";

import { INVITED_PENDING_PASSWORD_KEY } from "@/lib/auth/platform-identity-invites";
import { createRequestAuthClient } from "@/lib/supabase/admin-access";

// D22: a NEW invited session (D20's native invite, before the person sets a
// real password) is globally limited to invite consumption, password setup
// and logout -- every route, not just /admin. proxy.ts is the ONE place
// every PAGE and Server Action in this app already passes through (it is
// Next's replacement for middleware, matched against everything except
// api/_next/static/_next/image/favicon.ico -- see its own matcher), and it
// already resolves the request's session once per pass for the existing
// admin gate, so isInvitedPendingPassword below reads off that SAME
// mechanism instead of adding a second one there.
//
// A Route Handler is neither a page nor a Server Action: proxy.ts's matcher
// excludes the whole `/api/*` tree unconditionally, so nothing here ever
// runs for it. Every authenticated Route Handler must therefore enforce
// D22 itself, off the SAME getUser() call it already makes to resolve its
// own identity -- lib/supabase/admin-route-auth.ts's authorizeAnyCandidate
// is that ONE shared choke point (authorizeStoreAdmin and requireSuperAdmin
// both funnel through it), so it is the other caller of the shared
// predicate below. Two callers, one rule: isInvitedPendingPasswordMetadata
// is the single place either of them may read the flag from, so neither can
// drift from the other.
//
// The signal itself lives in the session's own app_metadata (set by
// lib/auth/platform-identity-invites.ts via the service-role-only admin API,
// never user_metadata, which the client SDK could clear on its own).
export function isInvitedPendingPasswordMetadata(
  appMetadata: Record<string, unknown> | null | undefined,
): boolean {
  return appMetadata?.[INVITED_PENDING_PASSWORD_KEY] === true;
}

// proxy.ts's reader: costs nothing beyond the getUser() call its other gates
// already make -- no extra Postgres round trip, since app_metadata travels
// inside the session GoTrue already validated.
export async function isInvitedPendingPassword(request: NextRequest): Promise<boolean> {
  const authClient = createRequestAuthClient(request);
  if (!authClient) {
    return false;
  }

  const { data } = await authClient.auth.getUser();
  return isInvitedPendingPasswordMetadata(data.user?.app_metadata);
}
