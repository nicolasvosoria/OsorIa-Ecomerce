import { getSupabaseEcommerce } from './client'
import { getSupabaseServiceClient } from './admin-store'
import { ECOMMERCE_TABLES } from './contract'
import { getBusinessDayStartUtc, getBusinessMonthStartUtc, toBusinessDayKey } from '@/lib/date/business-day'
import { ORDER_STATUSES } from '@/lib/orders/order-status'
import type { Order } from './orders-api'

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

export interface OrderStatusBreakdown {
  status: Order['status']
  count: number
}

export interface RecentOrderSummary {
  id: string
  orderNumber: string
  customerName: string
  total: number
  status: Order['status']
  createdAt: string
}

export interface StoreDashboardSummary {
  monthlySales: number
  ordersToday: number
  averageOrderValue: number
  lowStockItems: number
  pendingOrders: number
  salesByDay: SalesByDay[]
  ordersByStatus: OrderStatusBreakdown[]
  recentOrders: RecentOrderSummary[]
}

const TREND_DAYS = 30
const RECENT_ORDERS_LIMIT = 6
const MS_PER_DAY = 86_400_000

const EMPTY_DASHBOARD_SUMMARY: StoreDashboardSummary = {
  monthlySales: 0,
  ordersToday: 0,
  averageOrderValue: 0,
  lowStockItems: 0,
  pendingOrders: 0,
  salesByDay: [],
  ordersByStatus: [],
  recentOrders: [],
}

type WindowOrderRow = {
  created_at: string
  status: string | null
  payment_status: string | null
  total_amount: unknown
}

type RecentOrderRow = {
  id: string
  order_number: string | null
  order_date: string | null
  created_at: string
  status: string | null
  total_amount: unknown
  customer_first_name: string | null
  customer_last_name: string | null
  customer_email: string | null
}

type TrackedItemRow = {
  inventory_quantity: number | null
  low_stock_threshold: number | null
}

export async function getStoreDashboardSummary(storeId: string): Promise<StoreDashboardSummary> {
  try {
    const supabase = getSupabaseServiceClient()
    if (!supabase) {
      return EMPTY_DASHBOARD_SUMMARY
    }

    const now = new Date()
    const dayStartISO = getBusinessDayStartUtc(now).toISOString()
    const monthStartISO = getBusinessMonthStartUtc(now).toISOString()
    const trendStartISO = getTrendStartUtc(now).toISOString()
    const windowStartISO = trendStartISO < monthStartISO ? trendStartISO : monthStartISO

    const [windowOrdersResult, pendingOrdersResult, recentOrdersResult, trackedItemsResult] =
      await Promise.all([
        withTimeout(
          supabase
            .from(ECOMMERCE_TABLES.orders)
            .select('created_at, status, payment_status, total_amount')
            .eq('store_id', storeId)
            .gte('created_at', windowStartISO),
          10000,
          'getDashboardWindowOrders'
        ) as Promise<{ data: WindowOrderRow[] | null; error: any }>,
        withTimeout(
          supabase
            .from(ECOMMERCE_TABLES.orders)
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('status', 'pending'),
          10000,
          'getDashboardPendingOrders'
        ) as Promise<{ count: number | null; error: any }>,
        withTimeout(
          supabase
            .from(ECOMMERCE_TABLES.orders)
            .select(
              'id, order_number, order_date, created_at, status, total_amount, customer_first_name, customer_last_name, customer_email'
            )
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(RECENT_ORDERS_LIMIT),
          10000,
          'getDashboardRecentOrders'
        ) as Promise<{ data: RecentOrderRow[] | null; error: any }>,
        withTimeout(
          supabase
            .from(ECOMMERCE_TABLES.storeItems)
            .select('inventory_quantity, low_stock_threshold')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .eq('track_inventory', true),
          10000,
          'getDashboardTrackedItems'
        ) as Promise<{ data: TrackedItemRow[] | null; error: any }>,
      ])

    assertQuerySucceeded('las ventas del período', windowOrdersResult.error)
    assertQuerySucceeded('los pedidos pendientes', pendingOrdersResult.error)
    assertQuerySucceeded('los pedidos recientes', recentOrdersResult.error)
    assertQuerySucceeded('el inventario', trackedItemsResult.error)

    const windowOrders = windowOrdersResult.data ?? []
    const soldTrendOrders = windowOrders.filter(
      (order) => isSoldOrder(order) && order.created_at >= trendStartISO
    )
    const trendSales = sumAmounts(soldTrendOrders)

    return {
      monthlySales: sumAmounts(
        windowOrders.filter((order) => isSoldOrder(order) && order.created_at >= monthStartISO)
      ),
      ordersToday: windowOrders.filter((order) => order.created_at >= dayStartISO).length,
      averageOrderValue: soldTrendOrders.length > 0 ? trendSales / soldTrendOrders.length : 0,
      lowStockItems: (trackedItemsResult.data ?? []).filter(isLowStock).length,
      pendingOrders: pendingOrdersResult.count || 0,
      salesByDay: buildSalesByDay(soldTrendOrders, now),
      ordersByStatus: buildOrdersByStatus(windowOrders, trendStartISO),
      recentOrders: (recentOrdersResult.data ?? []).flatMap(toRecentOrderSummary),
    }
  } catch (error: any) {
    console.error('[Stats] Error al obtener el resumen del panel:', error)
    throw error
  }
}

// Una consulta a Supabase que falla resuelve con `.error`, no lanza: sin esta
// verificación el fallo se leería como datos vacíos reales.
function assertQuerySucceeded(label: string, error: unknown): void {
  if (!error) return
  throw new Error(`No se pudo cargar ${label} del panel`, { cause: error })
}

function getTrendStartUtc(now: Date): Date {
  return getBusinessDayStartUtc(new Date(now.getTime() - (TREND_DAYS - 1) * MS_PER_DAY))
}

function toAmount(value: unknown): number {
  return Number(value) || 0
}

function sumAmounts(orders: WindowOrderRow[]): number {
  return orders.reduce((sum, order) => sum + toAmount(order.total_amount), 0)
}

function isSoldOrder(order: WindowOrderRow): boolean {
  return (
    SOLD_ORDER_STATUSES.includes(order.status ?? '') &&
    SOLD_PAYMENT_STATUSES.includes(order.payment_status ?? '')
  )
}

function isLowStock(item: TrackedItemRow): boolean {
  return (item.inventory_quantity ?? 0) <= (item.low_stock_threshold ?? 0)
}

function buildSalesByDay(soldOrders: WindowOrderRow[], now: Date): SalesByDay[] {
  const totalsByDay = new Map<string, { sales: number; orders: number }>()
  soldOrders.forEach((order) => {
    const day = toBusinessDayKey(new Date(order.created_at))
    const totals = totalsByDay.get(day) ?? { sales: 0, orders: 0 }
    totalsByDay.set(day, {
      sales: totals.sales + toAmount(order.total_amount),
      orders: totals.orders + 1,
    })
  })

  return Array.from({ length: TREND_DAYS }, (_unused, index) => {
    const dayOffset = TREND_DAYS - 1 - index
    const date = toBusinessDayKey(new Date(now.getTime() - dayOffset * MS_PER_DAY))
    return { date, ...(totalsByDay.get(date) ?? { sales: 0, orders: 0 }) }
  })
}

function buildOrdersByStatus(orders: WindowOrderRow[], trendStartISO: string): OrderStatusBreakdown[] {
  const countsByStatus = new Map<Order['status'], number>()
  orders.forEach((order) => {
    if (order.created_at < trendStartISO) return
    const status = toKnownOrderStatus(order.status)
    if (!status) return
    countsByStatus.set(status, (countsByStatus.get(status) ?? 0) + 1)
  })

  return ORDER_STATUSES.filter((status) => countsByStatus.has(status)).map((status) => ({
    status,
    count: countsByStatus.get(status)!,
  }))
}

function toKnownOrderStatus(status: string | null): Order['status'] | null {
  return ORDER_STATUSES.find((known) => known === status) ?? null
}

// An order whose status is outside ORDER_STATUSES cannot be rendered as a status
// badge without inventing a label for it, so it is left out rather than mislabelled.
function toRecentOrderSummary(order: RecentOrderRow): RecentOrderSummary[] {
  const status = toKnownOrderStatus(order.status)
  if (!status) return []

  const customerName = [order.customer_first_name, order.customer_last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return [
    {
      id: order.id,
      orderNumber: order.order_number ?? order.id,
      customerName: customerName || order.customer_email || 'Cliente invitado',
      total: toAmount(order.total_amount),
      status,
      createdAt: order.order_date ?? order.created_at,
    },
  ]
}

/**
 * Obtener estadísticas detalladas para reportes
 */
export async function getDetailedStats(
  storeId: string,
  days: number = 30
): Promise<DetailedStats> {
  try {
    const supabase = getSupabaseServiceClient()
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
        .eq('store_id', storeId)
        .gte('created_at', startDateISO)
        .in('status', SOLD_ORDER_STATUSES)
        .in('payment_status', SOLD_PAYMENT_STATUSES),
      15000,
      'getSalesByDay'
    ) as { data: Array<{ created_at: string; total_amount: unknown; id: string }> | null; error: any }

    const ordersByStatusResult = await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.orders)
        .select('status, id')
        .eq('store_id', storeId)
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
          orders!inner(created_at, store_id)
        `)
        .eq('orders.store_id', storeId)
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

