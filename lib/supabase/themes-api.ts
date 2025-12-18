import { getSupabaseBrowserClient } from "./client"
import type { AppTheme } from "@/lib/types/theme"
import { requireAdmin } from "./permissions-api"

// Helper para agregar timeout a las promesas
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

export async function getThemes(): Promise<AppTheme[]> {
  console.log("[Theme] === INICIANDO getThemes ===")
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.error("[Theme] ❌ Supabase no configurado - retornando array vacío")
    return []
  }
  console.log("[Theme] ✅ Cliente Supabase obtenido")

  try {
    // Las peticiones de temas son independientes de la autenticación
    // No verificamos sesión para evitar bloqueos
    console.log("[Theme] Ejecutando consulta a app_themes (sin verificar sesión)...")
    console.log("[Theme] URL de Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    const startTime = Date.now()
    
    // Primero hacer una consulta simple para verificar conectividad
    try {
      console.log("[Theme] Probando conectividad con Supabase...")
      const testQuery = supabase.from("app_themes").select("id").limit(1)
      const testResult = await Promise.race([
        testQuery,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 5000))
      ])
      console.log("[Theme] Test de conectividad:", testResult ? "✅ OK" : "❌ Falló")
    } catch (testError) {
      console.error("[Theme] ❌ Error en test de conectividad:", testError)
      console.error("[Theme] Esto sugiere un problema de red o que RLS está bloqueando completamente las consultas")
    }
    
    const queryPromise = supabase
      .from("app_themes")
      .select("*")
      .order("theme_name")
    
    console.log("[Theme] Enviando consulta completa...")
    const { data, error } = await withTimeout(queryPromise, 20000)
    const elapsedTime = Date.now() - startTime
    console.log("[Theme] Consulta completada en", elapsedTime, "ms. Error:", error ? "Sí" : "No")

    if (error) {
      console.error("[Theme] ❌ Error fetching themes:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2),
      })
      
      // Si el error es de permisos o RLS, dar más información
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS')) {
        console.error("[Theme] ⚠️ Posible problema de RLS o permisos. Verifica que RLS esté deshabilitado o que las políticas permitan lectura pública.")
      }
      
      return []
    }

    if (!data || data.length === 0) {
      console.warn("[Theme] ⚠️ No se encontraron temas en la base de datos")
      return []
    }

    console.log("[Theme] ✅ Temas cargados exitosamente:", data.length)
    const themes = data.map((theme) => ({
      ...theme,
      colors: typeof theme.colors === "string" ? JSON.parse(theme.colors) : theme.colors,
    })) as AppTheme[]
    console.log("[Theme] === FINALIZANDO getThemes ===")
    return themes
  } catch (err) {
    console.error("[Theme] ❌ Excepción al obtener temas:", err)
    if (err instanceof Error) {
      console.error("[Theme] Mensaje de error:", err.message)
      console.error("[Theme] Stack:", err.stack)
    }
    return []
  }
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
  // Verificar que el usuario es administrador
  try {
    await requireAdmin()
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Se requieren permisos de administrador" 
    }
  }

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
