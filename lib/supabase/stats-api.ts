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

export interface SalesByDay {
  date: string
  sales: number
  orders: number
}

export interface OrdersByStatus {
  status: string
  count: number
}

export interface TopProduct {
  id: string
  name: string
  sales: number
  quantity: number
  revenue: number
}

export interface DetailedStats {
  salesByDay: SalesByDay[]
  ordersByStatus: OrdersByStatus[]
  topProducts: TopProduct[]
  totalOrders: number
  averageOrderValue: number
  conversionRate: number
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
        // Convertir total_amount a número (viene como string desde Supabase)
        return sum + (Number(order.total_amount) || 0)
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

/**
 * Obtener estadísticas detalladas para reportes
 */
export async function getDetailedStats(days: number = 30): Promise<DetailedStats> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        salesByDay: [],
        ordersByStatus: [],
        topProducts: [],
        totalOrders: 0,
        averageOrderValue: 0,
        conversionRate: 0,
      }
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateISO = startDate.toISOString()

    // Obtener ventas por día
    const salesByDayResult = await withTimeout(
      supabase
        .from('orders')
        .select('created_at, total_amount, id')
        .gte('created_at', startDateISO)
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
        .in('payment_status', ['paid']),
      15000,
      'getSalesByDay'
    ) as Promise<{ data: any[] | null; error: any }>

    // Obtener pedidos por estado
    const ordersByStatusResult = await withTimeout(
      supabase
        .from('orders')
        .select('status, id')
        .gte('created_at', startDateISO),
      15000,
      'getOrdersByStatus'
    ) as Promise<{ data: any[] | null; error: any }>

    // Obtener productos más vendidos (usando join con orders para filtrar por fecha del pedido)
    const topProductsResult = await withTimeout(
      supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          unit_price,
          product_name,
          product_id,
          orders!inner(created_at)
        `)
        .gte('orders.created_at', startDateISO),
      15000,
      'getTopProducts'
    ) as Promise<{ data: any[] | null; error: any }>

    // Procesar ventas por día
    const salesByDayMap = new Map<string, { sales: number; orders: number }>()
    if (salesByDayResult.data) {
      salesByDayResult.data.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        const existing = salesByDayMap.get(date) || { sales: 0, orders: 0 }
        // Convertir total_amount a número (viene como string desde Supabase)
        // Usar parseFloat para manejar decimales correctamente
        const totalAmount = parseFloat(String(order.total_amount)) || 0
        salesByDayMap.set(date, {
          sales: existing.sales + totalAmount,
          orders: existing.orders + 1,
        })
      })
    }

    // Generar array de últimos N días
    const salesByDay: SalesByDay[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const data = salesByDayMap.get(dateStr) || { sales: 0, orders: 0 }
      // Asegurar que sales y orders sean números
      salesByDay.push({
        date: dateStr,
        sales: Number(data.sales) || 0,
        orders: Number(data.orders) || 0,
      })
    }

    // Procesar pedidos por estado
    const ordersByStatusMap = new Map<string, number>()
    if (ordersByStatusResult.data) {
      ordersByStatusResult.data.forEach((order) => {
        const status = order.status || 'unknown'
        ordersByStatusMap.set(status, (ordersByStatusMap.get(status) || 0) + 1)
      })
    }

    const ordersByStatus: OrdersByStatus[] = Array.from(ordersByStatusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
      })
    )

    // Procesar productos más vendidos
    const productsMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    if (topProductsResult.data) {
      topProductsResult.data.forEach((item) => {
        const itemId = item.product_id || item.id || 'unknown'
        const productName = item.product_name || 'Producto desconocido'
        // Convertir valores a número (vienen como string desde Supabase)
        const quantity = Number(item.quantity) || 0
        const unitPrice = Number(item.unit_price) || 0
        const revenue = unitPrice * quantity

        const existing = productsMap.get(itemId) || { name: productName, quantity: 0, revenue: 0 }
        productsMap.set(itemId, {
          name: existing.name || productName,
          quantity: existing.quantity + quantity,
          revenue: existing.revenue + revenue,
        })
      })
    }

    const topProducts: TopProduct[] = Array.from(productsMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        sales: data.quantity,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Calcular estadísticas adicionales
    const totalOrders = ordersByStatusResult.data?.length || 0
    const paidOrders = salesByDayResult.data?.length || 0
    const totalSales = salesByDay.reduce((sum, day) => sum + (Number(day.sales) || 0), 0)
    // Valor promedio = total ventas (pedidos pagados) / cantidad de pedidos pagados
    const averageOrderValue = paidOrders > 0 ? totalSales / paidOrders : 0
    const conversionRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0

    return {
      salesByDay,
      ordersByStatus,
      topProducts,
      totalOrders,
      averageOrderValue,
      conversionRate,
    }
  } catch (error: any) {
    console.error('[Stats] Error al obtener estadísticas detalladas:', error)
    return {
      salesByDay: [],
      ordersByStatus: [],
      topProducts: [],
      totalOrders: 0,
      averageOrderValue: 0,
      conversionRate: 0,
    }
  }
}


