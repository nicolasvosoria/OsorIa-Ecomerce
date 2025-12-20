import { getSupabaseBrowserClient } from "./client"
import type { ComponentStyle } from "./types"
import { requireAdmin } from "./permissions-api"

// Helper para timeout
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  operation: string = 'operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms en ${operation}`)), timeoutMs)
    ),
  ])
}

export async function getComponentStyles() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from("component_styles").select("*").order("component_name"),
      15000,
      'getComponentStyles'
    )

    if (error) {
      console.error("[v0] Error fetching component styles:", error)
      return []
    }

    return (data || []) as ComponentStyle[]
  } catch (error: any) {
    console.error("[v0] Timeout o error al obtener estilos:", error.message || error)
    return []
  }
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
  // Verificar que el usuario es administrador
  await requireAdmin()

  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    throw new Error("Supabase is not configured")
  }

  try {
    // Usar upsert con onConflict especificado para la columna única
    const { data, error } = await supabase
      .from("component_styles")
      .upsert(
        {
          component_name: componentName,
          variables,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "component_name", // Especificar la columna única para el conflicto
        }
      )
      .select()
      .single()

    if (error) {
      console.error(`[v0] Error updating style for ${componentName}:`, error)
      console.error("[v0] Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      
      // Si el error es 409, intentar con UPDATE directo
      if (error.code === "409" || error.message?.includes("409")) {
        console.log(`[v0] Retrying with direct UPDATE for ${componentName}`)
        const { data: updateData, error: updateError } = await supabase
          .from("component_styles")
          .update({
            variables,
            updated_at: new Date().toISOString(),
          })
          .eq("component_name", componentName)
          .select()
          .single()

        if (updateError) {
          console.error(`[v0] Error in UPDATE retry for ${componentName}:`, updateError)
          throw updateError
        }

        return updateData as ComponentStyle
      }

      throw error
    }

    return data as ComponentStyle
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
          if (payload.new) {
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
