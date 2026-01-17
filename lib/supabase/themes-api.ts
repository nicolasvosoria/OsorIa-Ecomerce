import { getSupabaseBrowserClient } from "./client"
import type { AppTheme } from "@/lib/types/theme"
import { requireAdmin } from "./permissions-api"
import { getStoreId } from "@/lib/utils/store"

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
    // Obtener store_id actual
    let storeId = await getStoreId()
    
    // Si no hay store_id, intentar obtener el UUID de la tienda por defecto
    if (!storeId) {
      console.log("[Theme] No hay store_id disponible, obteniendo tienda por defecto...")
      const { data: defaultStore } = await supabase
        .from("stores")
        .select("id")
        .eq("subdomain", "default")
        .maybeSingle()
      
      if (defaultStore?.id) {
        storeId = defaultStore.id
        console.log("[Theme] ✅ Usando tienda por defecto:", storeId)
      } else {
        console.warn("[Theme] ⚠️ No se encontró tienda por defecto, consultando sin filtro store_id")
      }
    }
    
    console.log("[Theme] Ejecutando consulta a app_themes...")
    const startTime = Date.now()
    
    // Construir query - primero intentar sin filtro de store_id para evitar errores
    // si la columna no existe
    let queryPromise = supabase
      .from("app_themes")
      .select("*")
      .order("theme_name")
    
    // Intentar filtrar por store_id solo si está disponible
    // Si la columna no existe, simplemente consultar todos los temas
    if (storeId) {
      // Intentar agregar el filtro, pero si falla, continuar sin él
      queryPromise = queryPromise.eq("store_id", storeId)
    } else {
      // Si no hay store_id, consultar temas sin store_id (NULL) o todos
      queryPromise = queryPromise.is("store_id", null)
    }
    
    console.log("[Theme] Enviando consulta completa...")
    const result = await withTimeout(queryPromise, 20000) as { data: any; error: any }
    const { data, error } = result
    const elapsedTime = Date.now() - startTime
    console.log("[Theme] Consulta completada en", elapsedTime, "ms. Error:", error ? "Sí" : "No")

    if (error) {
      console.error("[Theme] ❌ Error fetching themes:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        storeId,
      })
      
      // Si el error es de permisos o RLS, dar más información
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS')) {
        console.error("[Theme] ⚠️ Posible problema de RLS o permisos. Verifica que RLS esté deshabilitado o que las políticas permitan lectura pública.")
      }
      
      return []
    }

    if (!data || data.length === 0) {
      console.warn("[Theme] ⚠️ No se encontraron temas en la base de datos para store_id:", storeId)
      return []
    }

    console.log("[Theme] ✅ Temas cargados exitosamente:", data.length)
    const themes = data.map((theme: any) => ({
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

  // Obtener store_id actual
  let storeId = await getStoreId()
  
  // Si no hay store_id, intentar obtener el UUID de la tienda por defecto
  if (!storeId) {
    const { data: defaultStore } = await supabase
      .from("stores")
      .select("id")
      .eq("subdomain", "default")
      .maybeSingle()
    
    if (defaultStore?.id) {
      storeId = defaultStore.id
    }
  }

  let query = supabase
    .from("app_themes")
    .select("*")
    .eq("is_active", true)
  
  if (storeId) {
    query = query.eq("store_id", storeId)
  } else {
    // Si no hay store_id, buscar temas sin store_id (NULL) o todos
    query = query.is("store_id", null)
  }

  const { data, error } = await query.single()

  if (error) {
    let errorCode: string | undefined
    let errorMessage: string | undefined
    let errorDetails: any
    let errorHint: string | undefined

    if (error && typeof error === 'object') {
      try {
        errorCode = 'code' in error ? String((error as any).code) : undefined
        errorMessage = 'message' in error ? String((error as any).message) : undefined
        errorDetails = 'details' in error ? (error as any).details : undefined
        errorHint = 'hint' in error ? String((error as any).hint) : undefined
      } catch (e) {
        errorMessage = String(error)
      }
    } else {
      errorMessage = String(error)
    }

    // Si el error es "no rows found", no es un error crítico
    if (
      errorCode === 'PGRST116' ||
      errorMessage?.includes('No rows') ||
      errorMessage?.includes('not found') ||
      errorMessage?.includes('No rows returned') ||
      errorMessage?.includes('The result contains 0 rows')
    ) {
      console.log(`[Theme] No se encontró tema activo para store_id: ${storeId || 'NULL'}`)
      return null
    }

    const errorInfo: Record<string, any> = {
      storeId,
      errorType: typeof error,
    }

    if (errorMessage) errorInfo.message = errorMessage
    if (errorCode) errorInfo.code = errorCode
    if (errorDetails) errorInfo.details = errorDetails
    if (errorHint) errorInfo.hint = errorHint

    try {
      errorInfo.fullError = JSON.stringify(error, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          try {
            return value
          } catch {
            return '[Circular]'
          }
        }
        return value
      }, 2)
    } catch (e) {
      errorInfo.fullError = String(error)
    }

    console.error("[Theme] Error fetching active theme:", errorInfo)
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
    // Obtener store_id actual
    let storeId = await getStoreId()
    
    // Si no hay store_id, intentar obtener el UUID de la tienda por defecto
    if (!storeId) {
      const { data: defaultStore } = await supabase
        .from("stores")
        .select("id")
        .eq("subdomain", "default")
        .maybeSingle()
      
      if (defaultStore?.id) {
        storeId = defaultStore.id
      }
    }

    // Construir query para desactivar todos los temas de la tienda actual
    let deactivateQuery = supabase
      .from("app_themes")
      .update({ is_active: false })
      .neq("is_active", false)

    if (storeId) {
      deactivateQuery = deactivateQuery.eq("store_id", storeId)
    } else {
      deactivateQuery = deactivateQuery.is("store_id", null)
    }

    const { error: deactivateError } = await deactivateQuery

    if (deactivateError) {
      console.error("[Theme] Error deactivating themes:", deactivateError)
      return { success: false, error: "Error al desactivar temas" }
    }

    // Construir query para activar el tema seleccionado de la tienda actual
    let activateQuery = supabase
      .from("app_themes")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("theme_name", themeName)

    if (storeId) {
      activateQuery = activateQuery.eq("store_id", storeId)
    } else {
      activateQuery = activateQuery.is("store_id", null)
    }

    const { error: activateError } = await activateQuery

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
