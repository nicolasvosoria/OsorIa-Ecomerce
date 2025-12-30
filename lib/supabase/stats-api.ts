import { getSupabaseBrowserClient } from './client'

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

export interface DashboardStats {
  totalProducts: number
  ordersToday: number
  totalUsers: number
  monthlySales: number
}

/**
 * Obtener estadísticas del dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        totalProducts: 0,
        ordersToday: 0,
        totalUsers: 0,
        monthlySales: 0,
      }
    }

    // Obtener todas las estadísticas en paralelo
    const [productsResult, ordersTodayResult, usersResult, monthlySalesResult] = await Promise.all([
      // Conteo de productos activos
      withTimeout(
        supabase
          .from('store_items')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        10000,
        'getProductsCount'
      ) as Promise<{ count: number | null; error: any }>,
      
      // Pedidos de hoy
      withTimeout(
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'),
        10000,
        'getOrdersTodayCount'
      ) as Promise<{ count: number | null; error: any }>,
      
      // Conteo de usuarios
      withTimeout(
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true }),
        10000,
        'getUsersCount'
      ) as Promise<{ count: number | null; error: any }>,
      
      // Ventas del mes actual
      withTimeout(
        supabase
          .from('orders')
          .select('total_amount, currency_code')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
          .in('payment_status', ['paid']),
        10000,
        'getMonthlySales'
      ) as Promise<{ data: any[] | null; error: any }>,
    ])

    // Procesar resultados
    const totalProducts = productsResult.count || 0
    const ordersToday = ordersTodayResult.count || 0
    const totalUsers = usersResult.count || 0

    // Calcular ventas del mes
    let monthlySales = 0
    if (monthlySalesResult.data) {
      monthlySales = monthlySalesResult.data.reduce((sum, order) => {
        return sum + (order.total_amount || 0)
      }, 0)
    }

    return {
      totalProducts,
      ordersToday,
      totalUsers,
      monthlySales,
    }
  } catch (error: any) {
    console.error('[Stats] Error al obtener estadísticas:', error)
    return {
      totalProducts: 0,
      ordersToday: 0,
      totalUsers: 0,
      monthlySales: 0,
    }
  }
}

