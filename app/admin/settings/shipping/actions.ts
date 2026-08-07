"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import { shippingModeFormSchema } from "@/lib/shipping/schemas"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { saveShippingMode } from "@/lib/supabase/shipping-settings-api"

const SHIPPING_SETTINGS_PATH = "/admin/settings/shipping"
const SETTINGS_PATH = "/admin/settings"
const INVALID_INPUT = "Los datos no son válidos. Revisa el formulario e intenta de nuevo."
const SAVE_ERROR_MESSAGE = "No se pudo guardar el modo de envío"

// D13/D27: storeId always comes from the active-store gate, never from the
// client -- the same authority shape every other settings action in this
// console uses (setActiveStorePublication, updateStoreIdentityFields).
export async function updateShippingModeAction(input: unknown): Promise<AdminActionResult> {
  const parsed = shippingModeFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization

  try {
    await saveShippingMode(supabase, storeId, parsed.data.mode)
  } catch (error) {
    console.error("[Shipping Settings] Error al guardar el modo de envío:", error)
    return { success: false, error: SAVE_ERROR_MESSAGE }
  }

  revalidatePath(SHIPPING_SETTINGS_PATH)
  revalidatePath(SETTINGS_PATH)
  return { success: true }
}
