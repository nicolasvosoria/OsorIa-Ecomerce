import { getSupabaseBrowserClient } from "./client"
import type { ComponentStyle } from "./types"

export async function getComponentStyles() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase.from("component_styles").select("*").order("component_name")

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

  const { data, error } = await supabase
    .from("component_styles")
    .select("*")
    .eq("component_name", componentName)
    .single()

  if (error) {
    console.error(`[v0] Error fetching style for ${componentName}:`, error)
    return null
  }

  return data as ComponentStyle
}

export async function updateComponentStyle(componentName: string, variables: Record<string, any>) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    throw new Error("Supabase is not configured")
  }

  const { data, error } = await supabase
    .from("component_styles")
    .upsert({
      component_name: componentName,
      variables,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error(`[v0] Error updating style for ${componentName}:`, error)
    throw error
  }

  return data as ComponentStyle
}

export async function subscribeToStyleChanges(componentName: string, callback: (payload: ComponentStyle) => void) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return {
      unsubscribe: () => {},
    }
  }

  const channel = supabase
    .channel(`component_styles:${componentName}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "component_styles",
        filter: `component_name=eq.${componentName}`,
      },
      (payload) => {
        console.log("[v0] Style change detected:", payload)
        if (payload.new) {
          callback(payload.new as ComponentStyle)
        }
      },
    )
    .subscribe()

  return channel
}
