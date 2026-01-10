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
      const ecommerce = supabase.schema("ecommerce")
      const { data: defaultStore } = await ecommerce
        .from("stores_legacy")
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
    
    // Construir query con filtro de store_id si está disponible
    const ecommerce = supabase.schema("ecommerce")
    let queryPromise = ecommerce
      .from("app_themes_legacy")
      .select("*")
      .order("theme_name")
    
    if (storeId) {
      queryPromise = queryPromise.eq("store_id", storeId)
    } else {
      // Si no hay store_id, intentar consultar temas sin store_id (NULL) o todos
      // Esto permite compatibilidad con instalaciones anteriores
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
    const themes = data.map((theme: any) => {
      // La vista legacy expone 'colors' como 'theme_config'
      const themeColors = theme.theme_config || theme.colors || null
      let parsedColors: any = null
      if (themeColors) {
        if (typeof themeColors === "string") {
          try {
            parsedColors = JSON.parse(themeColors)
          } catch (e) {
            console.error("[Theme] Error parsing theme colors:", e)
            parsedColors = null
          }
        } else {
          parsedColors = themeColors
        }
      }
      return {
        ...theme,
        colors: parsedColors,
      }
    }) as AppTheme[]
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
    const ecommerce = supabase.schema("ecommerce")
    const { data: defaultStore } = await ecommerce
      .from("stores_legacy")
      .select("id")
      .eq("subdomain", "default")
      .maybeSingle()
    
    if (defaultStore?.id) {
      storeId = defaultStore.id
    }
  }

  const ecommerce = supabase.schema("ecommerce")
  let query = ecommerce
    .from("app_themes_legacy")
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

  // La vista legacy expone 'colors' como 'theme_config'
  const themeColors = data.theme_config || data.colors || null
  
  // Parsear colors si es un string
  let parsedColors: any = null
  if (themeColors) {
    if (typeof themeColors === "string") {
      try {
        parsedColors = JSON.parse(themeColors)
      } catch (e) {
        console.error("[Theme] Error parsing theme colors:", e)
        parsedColors = null
      }
    } else {
      parsedColors = themeColors
    }
  }

  return {
    ...data,
    colors: parsedColors,
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
      const ecommerce = supabase.schema("ecommerce")
      const { data: defaultStore } = await ecommerce
        .from("stores_legacy")
        .select("id")
        .eq("subdomain", "default")
        .maybeSingle()
      
      if (defaultStore?.id) {
        storeId = defaultStore.id
      }
    }

    // Obtener el theme_id del tema por nombre
    const ecommerce = supabase.schema("ecommerce")
    const { data: themeData } = await ecommerce
      .from("app_themes")
      .select("id")
      .eq("theme_name", themeName)
      .maybeSingle()

    if (!themeData?.id) {
      return { success: false, error: "Tema no encontrado" }
    }

    const themeId = themeData.id

    // Si hay store_id, usar app_theme_versions para gestionar temas por tienda
    if (storeId) {
      // Desactivar todos los temas de la tienda actual
      await ecommerce
        .from("app_theme_versions")
        .update({ is_current: false })
        .eq("store_id", storeId)
        .catch(err => console.error("[Theme] Error al desactivar temas:", err))

      // Activar o crear el tema seleccionado para la tienda
      const { data: existingVersion } = await ecommerce
        .from("app_theme_versions")
        .select("id")
        .eq("store_id", storeId)
        .eq("theme_id", themeId)
        .maybeSingle()

      if (existingVersion) {
        await ecommerce
          .from("app_theme_versions")
          .update({ is_current: true })
          .eq("id", existingVersion.id)
          .catch(err => console.error("[Theme] Error al activar tema:", err))
      } else {
        // Crear nueva versión de tema
        // Generar UUID usando función RPC de Supabase o función nativa
        let versionId: string
        try {
          const { data: uuidData } = await supabase.rpc('gen_random_uuid').single()
          versionId = uuidData || self.crypto?.randomUUID() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        } catch {
          // Si RPC no funciona, usar crypto nativo o generar UUID manual
          versionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto 
            ? crypto.randomUUID() 
            : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }

        const { error: insertError } = await ecommerce
          .from("app_theme_versions")
          .insert({
            id: versionId,
            store_id: storeId,
            theme_id: themeId,
            is_current: true,
          })

        if (insertError) {
          console.error("[Theme] Error al crear versión de tema:", insertError)
          // Intentar sin especificar ID si el schema tiene DEFAULT
          const { error: retryError } = await ecommerce
            .from("app_theme_versions")
            .insert({
              store_id: storeId,
              theme_id: themeId,
              is_current: true,
            })

          if (retryError) {
            return { success: false, error: "Error al activar tema" }
          }
        }
      }
    } else {
      // Si no hay store_id, actualizar app_themes directamente (tema global)
      await ecommerce
        .from("app_themes")
        .update({ is_active: false })
        .neq("is_active", false)
        .catch(err => console.error("[Theme] Error al desactivar temas:", err))

      await ecommerce
        .from("app_themes")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("theme_name", themeName)
        .catch(err => {
          console.error("[Theme] Error al activar tema:", err)
          return { success: false, error: "Error al activar tema" }
        })
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido"
    return { success: false, error: errorMessage }
  }
}
