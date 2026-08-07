"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import {
  requestMailboxVerificationSchema,
  updateStoreIdentitySchema,
} from "@/lib/stores/schemas"
import { renderEmail } from "@/lib/email/render"
import { resolveEmailSender } from "@/lib/email/sender"
import { createVerificationToken } from "@/lib/security/verification-token"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { ECOMMERCE_FUNCTIONS, ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { loadStoreIdentity, toTenantEmailBranding } from "@/lib/supabase/store-identity-api"

const SETTINGS_PATH = "/admin/settings"
const INVALID_INPUT = "Los datos no son válidos. Revisa el formulario e intenta de nuevo."
const UNEXPECTED_FAILURE = "No se pudo guardar. Vuelve a intentarlo en un momento."

const MAILBOX_REQUEST_ERRORS: Record<string, string> = {
  not_authorized: "No tienes permiso para hacer este cambio.",
  invalid_field: INVALID_INPUT,
  invalid_email: "Ingresa un correo válido.",
  rate_limited: "Ya enviamos un enlace hace poco. Espera un momento antes de volver a intentarlo.",
}

// The panel has no other way to learn the send succeeded: it must reflect the
// new pending address in its badge and checklist right away, not just show a
// toast that auto-dismisses (B4).
export type RequestMailboxVerificationResult =
  | { success: true; pendingEmail: string }
  | { success: false; error: string }

export async function updateStoreIdentityFields(input: unknown): Promise<AdminActionResult> {
  const parsed = updateStoreIdentitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const { legalName, phone, commercialAddress } = parsed.data

  const [storeUpdate, contactUpsert] = await Promise.all([
    supabase.from(ECOMMERCE_TABLES.stores).update({ legal_name: legalName }).eq("id", storeId),
    supabase
      .from(ECOMMERCE_TABLES.storeContact)
      .upsert({ store_id: storeId, contact_phone: phone, address: commercialAddress }, { onConflict: "store_id" }),
  ])

  if (storeUpdate.error || contactUpsert.error) {
    console.error("[Store Identity] Error al guardar:", storeUpdate.error ?? contactUpsert.error)
    return { success: false, error: UNEXPECTED_FAILURE }
  }

  revalidatePath(SETTINGS_PATH)
  return { success: true }
}

// Renders the verification email in TS (SQL can't render React -- D13) and
// hands the SECURITY DEFINER function everything it needs to enqueue an
// immutable outbox snapshot in the same transaction as the rate-limit record
// and the pending-email write (D30).
export async function requestMailboxVerification(input: unknown): Promise<RequestMailboxVerificationResult> {
  const parsed = requestMailboxVerificationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId, userId } = authorization
  const { field, email } = parsed.data

  let identity
  try {
    identity = await loadStoreIdentity(supabase, storeId)
  } catch (error) {
    console.error("[Store Identity] Error al leer la tienda:", error)
    return { success: false, error: UNEXPECTED_FAILURE }
  }

  const { token, tokenHash } = createVerificationToken()
  const sender = resolveEmailSender("store-mailbox-verification", identity.displayName ?? "", null)
  const rendered = await renderEmail({
    kind: "store-mailbox-verification",
    branding: toTenantEmailBranding(identity),
    data: { purpose: field, actionPath: `/auth/mailbox-verification?token=${token}` },
  })

  const { data, error } = await supabase.rpc(ECOMMERCE_FUNCTIONS.requestStoreMailboxVerification, {
    p_actor_user_id: userId,
    p_store_id: storeId,
    p_field: field,
    p_new_email: email,
    p_token_hash: tokenHash,
    p_email_from: sender.from,
    p_email_subject: rendered.subject,
    p_email_html: rendered.html,
    p_email_text: rendered.text,
    p_idempotency_key: `mailbox-verification:${storeId}:${field}:${tokenHash}`,
  })

  if (error) {
    console.error("[Store Identity] Error al solicitar verificación:", error)
    return { success: false, error: UNEXPECTED_FAILURE }
  }

  if (!data?.ok) {
    return { success: false, error: MAILBOX_REQUEST_ERRORS[data?.reason] ?? UNEXPECTED_FAILURE }
  }

  revalidatePath(SETTINGS_PATH)
  return { success: true, pendingEmail: email }
}
