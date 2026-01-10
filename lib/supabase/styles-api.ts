import { getSupabaseBrowserClient } from "./client"
import type { ComponentStyle } from "./types"
import { requireAdmin } from "./permissions-api"
import { getStoreId } from "@/lib/utils/store"

export async function getComponentStyles() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return []
  }

  // Obtener store_id actual
  const storeId = await getStoreId()
  if (!storeId) {
    console.warn("[v0] No store_id available, returning empty array")
    return []
  }

  const ecommerce = supabase.schema("ecommerce")
  const { data, error } = await ecommerce
    .from("component_styles_legacy")
    .select("*")
    .eq("store_id", storeId)
    .order("component_name")

  if (error) {
    console.error("[v0] Error fetching component styles:", error)
    return []
  }

  return data as ComponentStyle[]
}

export async function getComponentStyleByName(componentName: string) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return null
  }

  // Obtener store_id actual
  const storeId = await getStoreId()
  if (!storeId) {
    console.warn(`[v0] No store_id available for ${componentName}`)
    return null
  }

  const ecommerce = supabase.schema("ecommerce")
  const { data, error } = await ecommerce
    .from("component_styles_legacy")
    .select("*")
    .eq("component_name", componentName)
    .eq("store_id", storeId)
    .maybeSingle()

  if (error) {
    console.error(`[v0] Error fetching style for ${componentName}:`, error)
    return null
  }

  return data as ComponentStyle
}

export async function updateComponentStyle(componentName: string, variables: Record<string, any>) {
  // Verificar que el usuario es administrador
  await requireAdmin()

  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    throw new Error("Supabase is not configured")
  }

  // Obtener store_id actual
  const storeId = await getStoreId()
  if (!storeId) {
    // Si no hay store_id, intentar obtener el UUID de la tienda por defecto
    const ecommerce = supabase.schema("ecommerce")
    const { data: defaultStore } = await ecommerce
      .from("stores_legacy")
      .select("id")
      .eq("subdomain", "default")
      .maybeSingle()
    
    if (!defaultStore?.id) {
      throw new Error("No store_id available and default store not found")
    }
    
    const finalStoreId = storeId || defaultStore.id
    return await updateComponentStyleWithStoreId(componentName, variables, finalStoreId, supabase)
  }

  return await updateComponentStyleWithStoreId(componentName, variables, storeId, supabase)
}

async function updateComponentStyleWithStoreId(
  componentName: string,
  variables: Record<string, any>,
  storeId: string,
  supabase: ReturnType<typeof getSupabaseBrowserClient>
) {
  if (!supabase) {
    throw new Error("Supabase is not configured")
  }

  try {
    const ecommerce = supabase.schema("ecommerce")
    // Primero verificar si el registro existe
    const { data: existing, error: checkError } = await ecommerce
        .from("component_styles")
        .select("id")
        .eq("component_name", componentName)
        .eq("store_id", storeId)
        .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 es "no rows returned", que es esperado si no existe
      console.error(`[v0] Error checking existing style for ${componentName}:`, checkError)
    }

    let data: ComponentStyle | null = null
    let error: any = null

    if (existing) {
      // Si existe, hacer UPDATE
      const result = await ecommerce
        .from("component_styles")
        .update({
          variables,
          updated_at: new Date().toISOString(),
        })
        .eq("component_name", componentName)
        .eq("store_id", storeId)
        .select()
        .maybeSingle()
      
      data = result.data as ComponentStyle | null
      error = result.error
    } else {
      // Si no existe, hacer INSERT
      const result = await ecommerce
        .from("component_styles")
        .insert({
          component_name: componentName,
          store_id: storeId,
          variables,
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle()
      
      data = result.data as ComponentStyle | null
      error = result.error
    }

    if (error) {
      console.error(`[v0] Error updating style for ${componentName}:`, error)
      console.error("[v0] Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        storeId,
        exists: !!existing,
      })
      throw error
    }

    if (!data) {
      throw new Error(`Failed to update style for ${componentName}: no data returned`)
    }

    return data
  } catch (err) {
    console.error(`[v0] Unexpected error updating style for ${componentName}:`, err)
    throw err
  }
}

export async function subscribeToStyleChanges(componentName: string, callback: (payload: ComponentStyle) => void) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return {
      unsubscribe: () => {},
    }
  }

  try {
    // Obtener store_id actual
    const storeId = await getStoreId()
    if (!storeId) {
      return {
        unsubscribe: () => {},
      }
    }

    const channel = supabase
      .channel(`component_styles:${componentName}:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "component_styles",
          filter: `component_name=eq.${componentName}`,
        },
        (payload: any) => {
          // Solo procesar si el store_id coincide
          if (payload.new && payload.new.store_id === storeId) {
            callback(payload.new as ComponentStyle)
          }
        },
      )
      .subscribe()

    return channel
  } catch (error) {
    // Falla silenciosamente si el realtime no está disponible
    // Esto no es crítico para la funcionalidad básica
    return {
      unsubscribe: () => {},
    }
  }
}
