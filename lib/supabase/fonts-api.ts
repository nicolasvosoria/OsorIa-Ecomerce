import { getSupabaseBrowserClient } from "./client"
import type { AppFont } from "@/lib/types/font"

export async function getFonts(): Promise<AppFont[]> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.warn("[Font] Supabase not configured")
    return []
  }

  const { data, error } = await supabase
    .from("app_fonts")
    .select("*")
    .order("font_name")

  if (error) {
    console.error("[Font] Error fetching fonts:", error)
    return []
  }

  return (data || []) as AppFont[]
}

export async function getActiveFont(): Promise<AppFont | null> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("app_fonts")
    .select("*")
    .eq("is_active", true)
    .single()

  if (error) {
    console.error("[Font] Error fetching active font:", error)
    return null
  }

  if (!data) return null

  return data as AppFont
}

export async function setActiveFont(fontName: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { success: false, error: "Supabase no configurado" }
  }

  try {
    // Primero desactivar todas las fuentes
    const { error: deactivateError } = await supabase
      .from("app_fonts")
      .update({ is_active: false })
      .neq("is_active", false)

    if (deactivateError) {
      console.error("[Font] Error deactivating fonts:", deactivateError)
      return { success: false, error: "Error al desactivar fuentes" }
    }

    // Luego activar la fuente seleccionada
    const { error: activateError } = await supabase
      .from("app_fonts")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("font_name", fontName)

    if (activateError) {
      console.error("[Font] Error activating font:", activateError)
      return { success: false, error: "Error al activar fuente" }
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido"
    return { success: false, error: errorMessage }
  }
}
