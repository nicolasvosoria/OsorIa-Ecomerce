"use server"

import { redirect } from "next/navigation"

import { getSupabaseAuthClient } from "@/lib/supabase/admin-route-auth"
import { clearMustChangePassword, type MembershipResult } from "@/lib/supabase/memberships-api"

// Lifts the forced-change flag once the owner has replaced the temporary password,
// then sends them into the admin. The browser client changes the password first
// (updatePassword); this runs only on that success — clearing the flag before the
// password changed would leave the temporary one alive with the guard already
// lifted. The userId is resolved from the session cookie, never taken from the
// client, so a caller can only lift their own flag.
export async function completeForcedPasswordChange(): Promise<MembershipResult> {
  const authClient = await getSupabaseAuthClient()
  const userId = (await authClient?.auth.getUser())?.data?.user?.id
  if (!userId) {
    return { success: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." }
  }

  const result = await clearMustChangePassword(userId)
  if (!result.success) {
    return result
  }

  redirect("/admin")
}
