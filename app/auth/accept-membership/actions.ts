"use server"

import { hashVerificationToken } from "@/lib/security/verification-token"
import { ECOMMERCE_FUNCTIONS } from "@/lib/supabase/contract"
import { getServiceEcommerceClient } from "@/lib/supabase/service-client"
import { resolveServerAuthSession } from "@/lib/supabase/server-auth-session"

// B5: "the RPC explicitly rejected this token" and "nothing told us either
// way" are different situations for the caller -- only the first justifies
// destroying the accept button for good, so they're separate outcomes
// instead of collapsing into one `success: false`.
export type AcceptMembershipInviteResult =
  | { outcome: "accepted" }
  | { outcome: "invalid"; error: string }
  | { outcome: "unavailable"; error: string }

const GENERIC_ERROR = "Este enlace no es válido, ya se usó o ya expiró."
const TRANSPORT_ERROR = "No pudimos completar la solicitud. Intenta de nuevo."

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
    return { outcome: "unavailable", error: "Inicia sesión para aceptar esta invitación." }
  }

  const supabase = getServiceEcommerceClient()
  if (!supabase) {
    return { outcome: "unavailable", error: "Supabase no configurado" }
  }

  const { data, error } = await supabase.rpc(ECOMMERCE_FUNCTIONS.acceptMembershipInvite, {
    p_user_id: session.userId,
    p_token_hash: hashVerificationToken(token),
  })

  if (error) {
    return { outcome: "unavailable", error: TRANSPORT_ERROR }
  }

  if (!data?.ok) {
    return { outcome: "invalid", error: GENERIC_ERROR }
  }

  return { outcome: "accepted" }
}
