import { getSupabaseBrowserClient } from "./client"
import type { AppTheme } from "@/lib/types/theme"

export async function getThemes(): Promise<AppTheme[]> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.warn("[Theme] Supabase not configured")
    return []
  }

  const { data, error } = await supabase
    .from("app_themes")
    .select("*")
    .order("theme_name")

  if (error) {
    console.error("[Theme] Error fetching themes:", error)
    return []
  }

  return (data || []).map((theme) => ({
    ...theme,
    colors: typeof theme.colors === "string" ? JSON.parse(theme.colors) : theme.colors,
  })) as AppTheme[]
}

export async function getActiveTheme(): Promise<AppTheme | null> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("app_themes")
    .select("*")
    .eq("is_active", true)
    .single()

  if (error) {
    console.error("[Theme] Error fetching active theme:", error)
    return null
  }

  if (!data) return null

  return {
    ...data,
    colors: typeof data.colors === "string" ? JSON.parse(data.colors) : data.colors,
  } as AppTheme
}

export async function setActiveTheme(themeName: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { success: false, error: "Supabase no configurado" }
  }

  try {
    // Primero desactivar todos los temas
    const { error: deactivateError } = await supabase
      .from("app_themes")
      .update({ is_active: false })
      .neq("is_active", false)

    if (deactivateError) {
      console.error("[Theme] Error deactivating themes:", deactivateError)
      return { success: false, error: "Error al desactivar temas" }
    }

    // Luego activar el tema seleccionado
    const { error: activateError } = await supabase
      .from("app_themes")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("theme_name", themeName)

    if (activateError) {
      console.error("[Theme] Error activating theme:", activateError)
      return { success: false, error: "Error al activar tema" }
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido"
    return { success: false, error: errorMessage }
  }
}
