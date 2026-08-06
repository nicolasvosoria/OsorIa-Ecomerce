"use server"

import { redirect } from "next/navigation"

import { clearInvitedPendingPassword } from "@/lib/auth/platform-identity-invites"
import { getSupabaseAuthClient } from "@/lib/supabase/admin-route-auth"

export type CompleteInviteSetupResult = { success: boolean; error?: string }

// D22: lifts the invited-session restriction once the browser has already
// set the real password (updatePassword, called first by the page under the
// live session verifyOtp established) -- ordered password-first like
// force-password-change/actions.ts's completeForcedPasswordChange, so a
// failure here never strands the flag cleared on a password that never
// actually changed. The userId comes from the session cookie, never the
// client, so a caller can only ever clear their own restriction.
export async function completeInviteSetup(): Promise<CompleteInviteSetupResult> {
  const authClient = await getSupabaseAuthClient()
  const userId = (await authClient?.auth.getUser())?.data?.user?.id
  if (!userId) {
    return { success: false, error: "Tu sesión expiró. Vuelve a abrir el enlace de invitación." }
  }

  const cleared = await clearInvitedPendingPassword(userId)
  if (!cleared) {
    return { success: false, error: "No se pudo completar la invitación. Intenta de nuevo." }
  }

  redirect("/admin")
}
