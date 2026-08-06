import type { NextRequest } from "next/server";

import { INVITED_PENDING_PASSWORD_KEY } from "@/lib/auth/platform-identity-invites";
import { createRequestAuthClient } from "@/lib/supabase/admin-access";

// D22: an invited session (before the person sets a real password) is
// globally limited to invite consumption, password setup and logout. Both
// proxy.ts and lib/supabase/admin-route-auth.ts's authorizeAnyCandidate
// funnel through this one predicate so neither can drift from the other.
// The flag lives in app_metadata, not user_metadata: only the service-role
// admin API (lib/auth/platform-identity-invites.ts) can write app_metadata,
// so a session can never clear its own restriction.
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
