import { redirect } from "next/navigation"

import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth-return-intent"
import { requiresPasswordChange } from "@/lib/supabase/memberships-api"

// A minted owner (D21) still on the temporary password is forced to the change
// screen before any admin use — the store panel and the platform console share
// this gate. That screen lives under /auth, outside every layout that calls it,
// so the redirect can never loop onto itself.
export async function redirectIfPasswordChangeRequired(
  userId: string,
  supabase?: any,
): Promise<void> {
  if (await requiresPasswordChange(userId, supabase)) {
    redirect(FORCE_PASSWORD_CHANGE_PATH)
  }
}
