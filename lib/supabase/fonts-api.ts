import { getSupabaseBrowserClient } from "./client"
import type { AppFont } from "@/lib/types/font"
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

export async function getFonts(): Promise<AppFont[]> {
  console.log("[Font] === INICIANDO getFonts ===")
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.error("[Font] ❌ Supabase no configurado - retornando array vacío")
    return []
  }
  console.log("[Font] ✅ Cliente Supabase obtenido")

  try {
    // Las peticiones de fuentes son independientes de la autenticación
    // No verificamos sesión para evitar bloqueos
    console.log("[Font] Ejecutando consulta a app_fonts (sin verificar sesión)...")
    console.log("[Font] URL de Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    const startTime = Date.now()
    
    // Primero hacer una consulta simple para verificar conectividad
    try {
      console.log("[Font] Probando conectividad con Supabase...")
      const testQuery = supabase.from("app_fonts").select("id").limit(1)
      const testResult = await Promise.race([
        testQuery,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 5000))
      ])
      console.log("[Font] Test de conectividad:", testResult ? "✅ OK" : "❌ Falló")
    } catch (testError) {
      console.error("[Font] ❌ Error en test de conectividad:", testError)
      console.error("[Font] Esto sugiere un problema de red o que RLS está bloqueando completamente las consultas")
    }
    
    const queryPromise = supabase
      .from("app_fonts")
      .select("*")
      .order("font_name")
    
    console.log("[Font] Enviando consulta completa...")
    const { data, error } = await withTimeout(queryPromise, 20000)
    const elapsedTime = Date.now() - startTime
    console.log("[Font] Consulta completada en", elapsedTime, "ms. Error:", error ? "Sí" : "No")

    if (error) {
      console.error("[Font] ❌ Error fetching fonts:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2),
      })
      
      // Si el error es de permisos o RLS, dar más información
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS')) {
        console.error("[Font] ⚠️ Posible problema de RLS o permisos. Verifica que RLS esté deshabilitado o que las políticas permitan lectura pública.")
      }
      
      return []
    }

    if (!data || data.length === 0) {
      console.warn("[Font] ⚠️ No se encontraron fuentes en la base de datos")
      return []
    }

    console.log("[Font] ✅ Fuentes cargadas exitosamente:", data.length)
    console.log("[Font] === FINALIZANDO getFonts ===")
    return data as AppFont[]
  } catch (err) {
    console.error("[Font] ❌ Excepción al obtener fuentes:", err)
    if (err instanceof Error) {
      console.error("[Font] Mensaje de error:", err.message)
      console.error("[Font] Stack:", err.stack)
    }
    return []
  }
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
