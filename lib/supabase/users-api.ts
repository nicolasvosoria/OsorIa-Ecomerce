import { getSupabaseBrowserClient } from './client'
import type { UserProfile } from '@/lib/types/user'

// Helper para manejar timeouts
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

export interface GetUsersParams {
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'email' | 'first_name' | 'last_name'
  order_direction?: 'asc' | 'desc'
  role?: 'user' | 'admin'
}

export interface GetUsersResult {
  users: UserProfile[]
  total: number
}

/**
 * Obtener lista de usuarios
 */
export async function getUsers(params: GetUsersParams = {}): Promise<GetUsersResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Users] Supabase no configurado')
      return { users: [], total: 0 }
    }

    const {
      limit = 100,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'desc',
      role,
    } = params

    const ecommerce = supabase.schema('ecommerce')
    let query = ecommerce
      .from('user_profiles')
      .select('*', { count: 'exact' })

    // Filtrar por rol si se especifica
    if (role) {
      query = query.eq('role', role)
    }

    // Ordenar
    query = query.order(order_by, { ascending: order_direction === 'asc' })
      .range(offset, offset + limit - 1)

    const result = await withTimeout(query, 15000, 'getUsers') as { 
      data: any[] | null
      error: any
      count: number | null
    }

    if (result.error) {
      console.error('[Users] Error al obtener usuarios:', result.error)
      return { users: [], total: 0 }
    }

    return {
      users: (result.data || []) as UserProfile[],
      total: result.count || 0,
    }
  } catch (error: any) {
    console.error('[Users] Error inesperado al obtener usuarios:', error)
    return { users: [], total: 0 }
  }
}

/**
 * Obtener un usuario por ID
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Users] Supabase no configurado')
      return null
    }

    const ecommerce = supabase.schema('ecommerce')
    const result = await withTimeout(
      ecommerce
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      15000,
      'getUserById'
    ) as { data: any; error: any }

    if (result.error || !result.data) {
      console.error('[Users] Error al obtener usuario:', result.error)
      return null
    }

    return result.data as UserProfile
  } catch (error: any) {
    console.error('[Users] Error inesperado al obtener usuario:', error)
    return null
  }
}




