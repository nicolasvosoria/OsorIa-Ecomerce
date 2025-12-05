import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase] ❌ Variables de entorno no configuradas")
    return null
  }

  // Siempre crear un nuevo cliente para asegurar que la sesión esté actualizada
  // El cliente de @supabase/ssr maneja automáticamente la sesión desde las cookies
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)
  }

  return supabaseClient
}

// Función para refrescar el cliente (útil después de cambios de autenticación)
export function refreshSupabaseClient() {
  supabaseClient = null
  return getSupabaseBrowserClient()
}
