import { createBrowserClient } from "@supabase/ssr"
import { ECOMMERCE_SCHEMA } from "./contract"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase] ❌ Variables de entorno no configuradas")
    return null
  }

  // Cliente estándar: Auth y sesión. Para datos ecommerce usar ecommerceFrom().
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)
  }

  return supabaseClient
}

/** Cliente con schema ecommerce para consultar vistas/tablas legacy. No usar para supabase.auth. */
export function getSupabaseEcommerce() {
  const client = getSupabaseBrowserClient()
  return client ? client.schema(ECOMMERCE_SCHEMA) : null
}

export function refreshSupabaseClient() {
  supabaseClient = null
  return getSupabaseBrowserClient()
}

/** Alias para compatibilidad: prefiere getSupabaseEcommerce() para datos de tienda. */
export const createClient = getSupabaseBrowserClient
