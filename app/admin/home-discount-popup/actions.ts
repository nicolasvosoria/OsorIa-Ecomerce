"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import type { HomeDiscountPopupFormValues } from "@/lib/home-discount-popup"
import { saveHomeDiscountPopupConfig } from "@/lib/home-discount-popup-admin"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"

const HOME_DISCOUNT_POPUP_PATH = "/admin/home-discount-popup"
const SAVE_ERROR_MESSAGE = "No se pudo guardar la configuración del popup"

export async function saveHomeDiscountPopupConfigAction(
  input: HomeDiscountPopupFormValues,
): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization

  try {
    await saveHomeDiscountPopupConfig(supabase, storeId, input)
  } catch (error) {
    console.error("[Home Discount Popup Action] Error al guardar:", error)
    return { success: false, error: SAVE_ERROR_MESSAGE }
  }

  revalidatePath(HOME_DISCOUNT_POPUP_PATH)
  return { success: true }
}
