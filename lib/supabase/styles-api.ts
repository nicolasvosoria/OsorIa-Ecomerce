import { getSupabaseBrowserClient, getSupabaseEcommerce } from "./client"
import type { ComponentStyle } from "./types"
import { requireAdmin } from "./permissions-api"
import { getStoreId } from "@/lib/utils/store"

function mapLegacyStyle(row: any): ComponentStyle {
  return {
    id: row.id,
    component_name: row.component_name,
    store_id: row.store_id,
    variables: row.style_config ?? row.variables ?? {},
    updated_at: row.updated_at,
  }
}

export async function getComponentStyles() {
  const supabase = getSupabaseEcommerce()
  if (!supabase) return []

  const storeId = await getStoreId()
  if (!storeId) {
    console.warn("[v0] No store_id available, returning empty array")
    return []
  }

  const { data, error } = await supabase
    .from("component_styles_legacy")
    .select("*")
    .eq("store_id", storeId)
    .order("component_name")

  if (error) {
    console.error("[v0] Error fetching component styles:", error)
    return []
  }

  return (data ?? []).map(mapLegacyStyle)
}

export async function getComponentStyleByName(componentName: string) {
  const supabase = getSupabaseEcommerce()
  if (!supabase) return null

  let storeId: string | null = null
  if (componentName === "hero") {
    const { data: defaultStore } = await supabase
      .from("stores_legacy")
      .select("id")
      .eq("subdomain", "default")
      .single()
    if (!defaultStore?.id) {
      console.warn(`[v0] Default store not found for ${componentName}`)
      return null
    }
    storeId = defaultStore.id
  } else {
    storeId = await getStoreId()
    if (!storeId) {
      console.warn(`[v0] No store_id available for ${componentName}`)
      return null
    }
  }

  const { data, error } = await supabase
    .from("component_styles_legacy")
    .select("*")
    .eq("component_name", componentName)
    .eq("store_id", storeId)
    .single()

  if (error) {
    console.error(`[v0] Error fetching style for ${componentName}:`, error)
    return null
  }

  return data ? mapLegacyStyle(data) : null
}

export async function updateComponentStyle(componentName: string, variables: Record<string, any>) {
  await requireAdmin()

  const supabase = getSupabaseEcommerce()
  if (!supabase) throw new Error("Supabase is not configured")

  if (componentName === "hero") {
    const { data: defaultStore } = await supabase
      .from("stores_legacy")
      .select("id")
      .eq("subdomain", "default")
      .single()
    if (!defaultStore?.id) {
      throw new Error("Default store not found. Hero component can only be edited for the default store.")
    }
    return await updateComponentStyleWithStoreId(componentName, variables, defaultStore.id, supabase)
  }

  const storeId = await getStoreId()
  if (!storeId) {
    const { data: defaultStore } = await supabase
      .from("stores_legacy")
      .select("id")
      .eq("subdomain", "default")
      .single()
    if (!defaultStore?.id) throw new Error("No store_id available and default store not found")
    return await updateComponentStyleWithStoreId(componentName, variables, defaultStore.id, supabase)
  }

  return await updateComponentStyleWithStoreId(componentName, variables, storeId, supabase)
}

async function updateComponentStyleWithStoreId(
  componentName: string,
  variables: Record<string, any>,
  storeId: string,
  supabase: NonNullable<ReturnType<typeof getSupabaseEcommerce>>
) {
  if (!supabase) throw new Error("Supabase is not configured")

  try {
    const { data: existing, error: checkError } = await supabase
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
      const result = await supabase
        .from("component_styles")
        .update({
          variables,
          updated_at: new Date().toISOString(),
        })
        .eq("component_name", componentName)
        .eq("store_id", storeId)
        .select()
        .single()
      
      data = result.data as ComponentStyle | null
      error = result.error
    } else {
      // Si no existe, hacer INSERT
      const result = await supabase
        .from("component_styles")
        .insert({
          component_name: componentName,
          store_id: storeId,
          variables,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      
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
  const supabase = getSupabaseEcommerce()
  if (!supabase) return { unsubscribe: () => {} }

  try {
    const storeId = await getStoreId()
    if (!storeId) return { unsubscribe: () => {} }

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
