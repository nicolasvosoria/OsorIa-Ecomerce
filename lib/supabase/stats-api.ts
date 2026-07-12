import { getSupabaseEcommerce } from './client'
import { ECOMMERCE_TABLES } from './contract'
import { getBusinessDayStartUtc, getBusinessMonthStartUtc, toBusinessDayKey } from '@/lib/date/business-day'

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

const SOLD_ORDER_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered']
const SOLD_PAYMENT_STATUSES = ['paid']

/**
 * Obtener estadísticas del dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return {
        totalProducts: 0,
        ordersToday: 0,
        totalUsers: 0,
        monthlySales: 0,
      }
    }

    const now = new Date()
    const businessDayStart = getBusinessDayStartUtc(now)
    const businessMonthStart = getBusinessMonthStartUtc(now)

    const [productsResult, ordersTodayResult, usersResult, monthlySalesResult] = await Promise.all([
      withTimeout(
        supabase
          .from(ECOMMERCE_TABLES.storeItems)
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        10000,
        'getProductsCount'
      ) as Promise<{ count: number | null; error: any }>,
      withTimeout(
        supabase
          .from(ECOMMERCE_TABLES.orders)
          .select('id', { count: 'exact', head: true })
          .gte('created_at', businessDayStart.toISOString()),
        10000,
        'getOrdersTodayCount'
      ) as Promise<{ count: number | null; error: any }>,
      withTimeout(
        supabase
          .from(ECOMMERCE_TABLES.userProfiles)
          .select('id', { count: 'exact', head: true }),
        10000,
        'getUsersCount'
      ) as Promise<{ count: number | null; error: any }>,
      withTimeout(
        supabase
          .from(ECOMMERCE_TABLES.orders)
          .select('total_amount, currency_code')
          .gte('created_at', businessMonthStart.toISOString())
          .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
          .in('payment_status', ['paid']),
        10000,
        'getMonthlySales'
      ) as Promise<{ data: Array<{ total_amount: unknown }> | null; error: any }>,
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
    const supabase = getSupabaseEcommerce()
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

    const salesByDayResult = await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.orders)
        .select('created_at, total_amount, id')
        .gte('created_at', startDateISO)
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
        .in('payment_status', ['paid']),
      15000,
      'getSalesByDay'
    ) as { data: Array<{ created_at: string; total_amount: unknown; id: string }> | null; error: any }

    const ordersByStatusResult = await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.orders)
        .select('status, id')
        .gte('created_at', startDateISO),
      15000,
      'getOrdersByStatus'
    ) as { data: Array<{ status: string | null; id: string }> | null; error: any }

    const topProductsResult = await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.orderItems)
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
    ) as { data: Array<{ id: string; quantity: unknown; unit_price: unknown; product_name: string | null; product_id: string | null }> | null; error: any }

    // Procesar ventas por día
    const salesByDayMap = new Map<string, { sales: number; orders: number }>()
    if (salesByDayResult.data) {
      salesByDayResult.data.forEach((order) => {
        const date = toBusinessDayKey(new Date(order.created_at))
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
      const dateStr = toBusinessDayKey(date)
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

/**
 * Obtener los IDs de los productos más vendidos (por unidades), en orden de ranking.
 * Solo tiene en cuenta pedidos confirmados/procesados/enviados/entregados y pagados.
 */
export async function getTopSellingProductIds(
  storeId: string | null,
  limit: number
): Promise<string[]> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return []
    }

    let query = supabase
      .from(ECOMMERCE_TABLES.orderItems)
      .select(`
        product_id,
        quantity,
        orders!inner(store_id, status, payment_status)
      `)
      .in('orders.status', SOLD_ORDER_STATUSES)
      .in('orders.payment_status', SOLD_PAYMENT_STATUSES)

    if (storeId) {
      query = query.eq('orders.store_id', storeId)
    }

    const result = await withTimeout(
      query,
      15000,
      'getTopSellingProductIds'
    ) as { data: Array<{ product_id: string | null; quantity: unknown }> | null; error: any }

    if (result.error || !result.data) {
      return []
    }

    const unitsByProductId = new Map<string, number>()
    result.data.forEach((row) => {
      if (!row.product_id) return
      const quantity = Number(row.quantity) || 0
      unitsByProductId.set(row.product_id, (unitsByProductId.get(row.product_id) || 0) + quantity)
    })

    return Array.from(unitsByProductId.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([productId]) => productId)
  } catch (error: any) {
    console.error('[Stats] Error al obtener productos más vendidos:', error)
    return []
  }
}

