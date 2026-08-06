"use server"

import { hashVerificationToken } from "@/lib/security/verification-token"
import { ECOMMERCE_FUNCTIONS } from "@/lib/supabase/contract"
import { getServiceEcommerceClient } from "@/lib/supabase/service-client"
import { resolveServerAuthSession } from "@/lib/supabase/server-auth-session"

export type AcceptMembershipInviteResult = { success: true } | { success: false; error: string }

const GENERIC_ERROR = "Este enlace no es válido, ya se usó o ya expiró."

// D21: the intended-user check happens entirely inside
// ecommerce.accept_membership_invite. This action supplies p_user_id from
// the session cookie alone, never from anything the client asserts, so a
// different authenticated user holding the same link can never accept on
// someone else's behalf -- and every rejection reason (wrong person,
// already used, expired, never existed) collapses to the SAME generic
// message here, same no-enumeration posture as D24's other tokens.
export async function acceptMembershipInviteAction(token: string): Promise<AcceptMembershipInviteResult> {
  const session = await resolveServerAuthSession()
  if (!session) {
    return { success: false, error: "Inicia sesión para aceptar esta invitación." }
  }

  const supabase = getServiceEcommerceClient()
  if (!supabase) {
    return { success: false, error: "Supabase no configurado" }
  }

  const { data, error } = await supabase.rpc(ECOMMERCE_FUNCTIONS.acceptMembershipInvite, {
    p_user_id: session.userId,
    p_token_hash: hashVerificationToken(token),
  })

  if (error || !data?.ok) {
    return { success: false, error: GENERIC_ERROR }
  }

  return { success: true }
}
