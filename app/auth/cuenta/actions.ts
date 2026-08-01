"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { accountProfileSchema, savedAddressDraftSchema } from "@/lib/account/schemas"
import { upsertAccountProfile } from "@/lib/supabase/account-profile-api"
import {
  resolveServerAuthSession,
  type ServerAuthSession,
} from "@/lib/supabase/server-auth-session"
import {
  createUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
  updateUserAddress,
} from "@/lib/supabase/user-addresses-api"

export type AccountActionResult = { success: true } | { success: false; error: string }

const ACCOUNT_PATH = "/auth/cuenta"

const SESSION_EXPIRED = "Tu sesión expiró. Vuelve a iniciar sesión."
const INVALID_INPUT = "Los datos no son válidos. Revisa el formulario e intenta de nuevo."
const UNEXPECTED_FAILURE = "No se pudo guardar. Vuelve a intentarlo en un momento."
const MISSING_ACCOUNT_EMAIL =
  "Tu cuenta no tiene un correo asociado, así que todavía no podemos guardar tus datos."

const addressTargetSchema = z.object({ addressId: z.string().uuid() })
const addressEditSchema = addressTargetSchema.extend({ draft: savedAddressDraftSchema })

export async function saveAccountProfile(input: unknown): Promise<AccountActionResult> {
  const parsed = accountProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  return runAccountMutation((session) => {
    if (!session.email) {
      throw new Error(MISSING_ACCOUNT_EMAIL)
    }

    return upsertAccountProfile(
      { userId: session.userId, email: session.email, profile: parsed.data },
      session.client,
    )
  })
}

export async function createSavedAddress(input: unknown): Promise<AccountActionResult> {
  const parsed = savedAddressDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  return runAccountMutation((session) =>
    createUserAddress({ userId: session.userId, draft: parsed.data }, session.client),
  )
}

export async function updateSavedAddress(input: unknown): Promise<AccountActionResult> {
  const parsed = addressEditSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  const { addressId, draft } = parsed.data
  return runAccountMutation((session) =>
    updateUserAddress({ userId: session.userId, addressId, draft }, session.client),
  )
}

export async function deleteSavedAddress(input: unknown): Promise<AccountActionResult> {
  const parsed = addressTargetSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  return runAccountMutation((session) =>
    deleteUserAddress({ userId: session.userId, addressId: parsed.data.addressId }, session.client),
  )
}

export async function setDefaultSavedAddress(input: unknown): Promise<AccountActionResult> {
  const parsed = addressTargetSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  return runAccountMutation((session) =>
    setDefaultUserAddress(
      { userId: session.userId, addressId: parsed.data.addressId },
      session.client,
    ),
  )
}

// El user_id sale siempre de la cookie de sesión, nunca del formulario: una
// action es un endpoint público y la persona solo puede escribir sus filas.
// El mensaje que sube la capa de datos viaja tal cual al toast — el fallo
// concreto (dirección ajena, RLS, red) es lo que la persona necesita leer.
async function runAccountMutation(
  mutate: (session: ServerAuthSession) => Promise<void>,
): Promise<AccountActionResult> {
  const session = await resolveServerAuthSession()
  if (!session) {
    return { success: false, error: SESSION_EXPIRED }
  }

  try {
    await mutate(session)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : UNEXPECTED_FAILURE,
    }
  }

  revalidatePath(ACCOUNT_PATH)
  return { success: true }
}
