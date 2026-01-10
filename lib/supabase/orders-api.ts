import { getSupabaseBrowserClient } from './client'

// Helper para obtener store_id
async function getStoreId(): Promise<string | null> {
  try {
    const { getStoreId: getStoreIdFn } = await import('@/lib/utils/store')
    return await getStoreIdFn()
  } catch (error) {
    console.warn('[Orders] Error al obtener store_id:', error)
    return null
  }
}

// Helper para generar order_number
async function generateOrderNumber(storeId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    throw new Error('Supabase no configurado')
  }

  const year = new Date().getFullYear()
  
  // Obtener el último número de pedido para este año y tienda
  const ecommerce = supabase.schema('ecommerce')
  const { data: lastOrder } = await ecommerce
    .from('orders')
    .select('order_number')
    .eq('store_id', storeId)
    .like('order_number', `ORD-${year}-%`)
    .order('order_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sequenceNum = 1
  if (lastOrder?.order_number) {
    const match = lastOrder.order_number.match(/\d+$/)
    if (match) {
      sequenceNum = parseInt(match[0], 10) + 1
    }
  }

  return `ORD-${year}-${sequenceNum.toString().padStart(6, '0')}`
}

// Tipos para pedidos
export interface Order {
  id: string
  order_number: string
  order_date: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  customer_type: 'guest' | 'user'
  user_id?: string | null
  customer_email: string
  customer_first_name: string
  customer_last_name: string
  customer_phone?: string | null
  shipping_address: string
  shipping_city: string
  shipping_postal_code: string
  shipping_country: string
  shipping_notes?: string | null
  payment_method?: string | null
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_reference?: string | null
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  currency_code: string
  notes?: string | null
  metadata?: Record<string, any>
  confirmed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id?: string | null
  product_name: string
  product_sku?: string | null
  variant_id?: string | null
  variant_title?: string | null
  unit_price: number
  quantity: number
  total_price: number
  currency_code: string
  product_image_url?: string | null
  product_slug?: string | null
  selected_options?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateOrderData {
  store_id?: string | null // Si no se proporciona, se obtiene automáticamente
  customer_type: 'guest' | 'user'
  user_id?: string | null
  customer_email: string
  customer_first_name: string
  customer_last_name: string
  customer_phone?: string
  shipping_address: string
  shipping_city: string
  shipping_postal_code: string
  shipping_country?: string
  shipping_notes?: string
  payment_method?: string
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_reference?: string
  subtotal: number
  shipping_cost?: number
  tax_amount?: number
  discount_amount?: number
  total_amount: number
  currency_code?: string
  notes?: string
  metadata?: Record<string, any>
  items: Array<{
    product_id?: string
    product_name: string
    product_sku?: string
    variant_id?: string
    variant_title?: string
    unit_price: number
    quantity: number
    total_price: number
    currency_code?: string
    product_image_url?: string
    product_slug?: string
    selected_options?: Record<string, any>
    metadata?: Record<string, any>
  }>
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

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

/**
 * Crear un nuevo pedido con sus items
 */
export async function createOrder(orderData: CreateOrderData): Promise<OrderWithItems | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Orders] Supabase no configurado')
      return null
    }

    // Obtener store_id
    let storeId = orderData.store_id
    if (!storeId) {
      storeId = await getStoreId()
      if (!storeId) {
        // Intentar obtener la tienda por defecto
        const ecommerce = supabase.schema('ecommerce')
        const { data: defaultStore } = await ecommerce
          .from('stores_legacy')
          .select('id')
          .eq('subdomain', 'default')
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle()
        
        if (!defaultStore?.id) {
          console.error('[Orders] No se pudo obtener store_id')
          return null
        }
        storeId = defaultStore.id
      }
    }

    if (!storeId) {
      console.error('[Orders] store_id es requerido')
      return null
    }

    // Generar order_number
    const orderNumber = await generateOrderNumber(storeId)

    // Mapear payment_status al enum del schema
    const paymentStatusMap: Record<string, string> = {
      'pending': 'pending',
      'paid': 'paid',
      'failed': 'failed',
      'refunded': 'refunded'
    }
    const mappedPaymentStatus = paymentStatusMap[orderData.payment_status || 'pending'] || 'pending'

    // Crear el pedido en la tabla real
    const ecommerce = supabase.schema('ecommerce')
    const orderResult = await withTimeout(
      ecommerce
        .from('orders')
        .insert({
          store_id: storeId,
          order_number: orderNumber,
          status: 'pending', // Usa el enum ecommerce.order_status
          user_id: orderData.user_id || null,
          customer_email: orderData.customer_email,
          subtotal: orderData.subtotal,
          shipping_cost: orderData.shipping_cost || 0,
          tax_amount: orderData.tax_amount || 0,
          discount_amount: orderData.discount_amount || 0,
          total_amount: orderData.total_amount,
          currency_code: orderData.currency_code || 'COP',
          notes: orderData.notes || null,
          metadata: orderData.metadata || {},
        })
        .select()
        .single(),
      20000,
      'createOrder'
    ) as { data: any; error: any }

    if (orderResult.error) {
      console.error('[Orders] Error al crear pedido:', orderResult.error)
      return null
    }

    const order = orderResult.data

    // Crear la dirección de envío
    const addressResult = await withTimeout(
      ecommerce
        .from('order_addresses')
        .insert({
          order_id: order.id,
          addr_type: 'shipping',
          first_name: orderData.customer_first_name,
          last_name: orderData.customer_last_name,
          email: orderData.customer_email,
          phone: orderData.customer_phone || null,
          address_line1: orderData.shipping_address,
          city: orderData.shipping_city,
          postal_code: orderData.shipping_postal_code,
          country: orderData.shipping_country || 'Colombia',
          notes: orderData.shipping_notes || null,
        })
        .select()
        .single(),
      15000,
      'createOrderAddress'
    ) as { data: any; error: any }

    if (addressResult.error) {
      console.error('[Orders] Error al crear dirección de envío:', addressResult.error)
      // Continuar aunque falle la dirección
    }

    // Crear la transacción de pago si hay información
    if (orderData.payment_method || orderData.payment_reference) {
      const paymentResult = await withTimeout(
        ecommerce
          .from('payment_transactions')
          .insert({
            order_id: order.id,
            provider: orderData.payment_method || 'unknown',
            provider_txn_id: orderData.payment_reference || null,
            status: mappedPaymentStatus as any, // Usa el enum ecommerce.payment_status
            amount: orderData.total_amount,
            currency_code: orderData.currency_code || 'COP',
          })
          .select()
          .single(),
        15000,
        'createPaymentTransaction'
      ) as { data: any; error: any }

      if (paymentResult.error) {
        console.error('[Orders] Error al crear transacción de pago:', paymentResult.error)
        // Continuar aunque falle el pago
      }
    }

    // Crear los items del pedido
    const itemsToInsert = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      product_sku: item.product_sku || null,
      variant_id: item.variant_id || null,
      variant_title: item.variant_title || null,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.total_price,
      currency_code: item.currency_code || 'COP',
      product_image_url: item.product_image_url || null,
      product_slug: item.product_slug || null,
      selected_options: item.selected_options || {},
      metadata: item.metadata || {},
    }))

    const itemsResult = await withTimeout(
      ecommerce
        .from('order_items')
        .insert(itemsToInsert)
        .select(),
      20000,
      'createOrderItems'
    ) as { data: any; error: any }

    if (itemsResult.error) {
      console.error('[Orders] Error al crear items del pedido:', itemsResult.error)
      // El pedido ya fue creado, pero los items fallaron
      return null
    }

    // Obtener el pedido completo usando la vista legacy para mantener compatibilidad
    const fullOrderResult = await withTimeout(
      ecommerce
        .from('orders_legacy')
        .select('*')
        .eq('id', order.id)
        .single(),
      15000,
      'getFullOrder'
    ) as { data: any; error: any }

    if (fullOrderResult.error || !fullOrderResult.data) {
      console.error('[Orders] Error al obtener pedido completo:', fullOrderResult.error)
      return null
    }

    return {
      ...fullOrderResult.data as Order,
      items: itemsResult.data as OrderItem[],
    }
  } catch (error: any) {
    console.error('[Orders] Error inesperado al crear pedido:', error)
    return null
  }
}

/**
 * Obtener un pedido por ID con sus items
 */
export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Orders] Supabase no configurado')
      return null
    }

    // Obtener el pedido
    const ecommerce = supabase.schema('ecommerce')
    const orderResult = await withTimeout(
      ecommerce
        .from('orders_legacy')
        .select('*')
        .eq('id', orderId)
        .single(),
      15000,
      'getOrderById'
    ) as { data: any; error: any }

    if (orderResult.error || !orderResult.data) {
      console.error('[Orders] Error al obtener pedido:', orderResult.error)
      return null
    }

    // Obtener los items del pedido
    const itemsResult = await withTimeout(
      ecommerce
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
      15000,
      'getOrderItems'
    ) as { data: any; error: any }

    return {
      ...(orderResult.data as Order),
      items: (itemsResult.data || []) as OrderItem[],
    }
  } catch (error: any) {
    console.error('[Orders] Error inesperado al obtener pedido:', error)
    return null
  }
}

/**
 * Obtener un pedido por número de pedido
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Orders] Supabase no configurado')
      return null
    }

    const ecommerce = supabase.schema('ecommerce')
    const orderResult = await withTimeout(
      ecommerce
        .from('orders_legacy')
        .select('*')
        .eq('order_number', orderNumber)
        .single(),
      15000,
      'getOrderByNumber'
    ) as { data: any; error: any }

    if (orderResult.error || !orderResult.data) {
      console.error('[Orders] Error al obtener pedido:', orderResult.error)
      return null
    }

    const order = orderResult.data as Order

    // Obtener los items del pedido
    const itemsResult = await withTimeout(
      ecommerce
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true }),
      15000,
      'getOrderItems'
    ) as { data: any; error: any }

    return {
      ...order,
      items: (itemsResult.data || []) as OrderItem[],
    }
  } catch (error: any) {
    console.error('[Orders] Error inesperado al obtener pedido:', error)
    return null
  }
}

/**
 * Obtener lista de pedidos
 */
export interface GetOrdersParams {
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'order_date' | 'total_amount'
  order_direction?: 'asc' | 'desc'
  status?: Order['status']
  payment_status?: Order['payment_status']
}

export interface GetOrdersResult {
  orders: Order[]
  total: number
}

export async function getOrders(params: GetOrdersParams = {}): Promise<GetOrdersResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Orders] Supabase no configurado')
      return { orders: [], total: 0 }
    }

    const {
      limit = 100,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'desc',
      status,
      payment_status,
    } = params

    const ecommerce = supabase.schema('ecommerce')
    let query = ecommerce
      .from('orders_legacy')
      .select('*', { count: 'exact' })

    // Filtrar por estado si se especifica
    if (status) {
      query = query.eq('status', status)
    }

    // Filtrar por estado de pago si se especifica
    if (payment_status) {
      query = query.eq('payment_status', payment_status)
    }

    // Ordenar
    query = query.order(order_by, { ascending: order_direction === 'asc' })
      .range(offset, offset + limit - 1)

    const result = await withTimeout(query, 15000, 'getOrders') as { 
      data: any[] | null
      error: any
      count: number | null
    }

    if (result.error) {
      console.error('[Orders] Error al obtener pedidos:', result.error)
      return { orders: [], total: 0 }
    }

    return {
      orders: (result.data || []) as Order[],
      total: result.count || 0,
    }
  } catch (error: any) {
    console.error('[Orders] Error inesperado al obtener pedidos:', error)
    return { orders: [], total: 0 }
  }
}

/**
 * Obtener pedidos por email del cliente
 */
export async function getOrdersByEmail(email: string, limit: number = 50): Promise<OrderWithItems[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Orders] Supabase no configurado')
      return []
    }

    const ecommerce = supabase.schema('ecommerce')
    const ordersResult = await withTimeout(
      ecommerce
        .from('orders_legacy')
        .select('*')
        .eq('customer_email', email)
        .order('order_date', { ascending: false })
        .limit(limit),
      15000,
      'getOrdersByEmail'
    ) as { data: any; error: any }

    if (ordersResult.error || !ordersResult.data) {
      console.error('[Orders] Error al obtener pedidos:', ordersResult.error)
      return []
    }

    const orders = ordersResult.data as Order[]

    // Obtener items para cada pedido
    const ordersWithItems: OrderWithItems[] = await Promise.all(
      orders.map(async (order) => {
        const itemsResult = await withTimeout(
          ecommerce
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: true }),
          10000,
          'getOrderItems'
        ) as { data: any; error: any }

        return {
          ...order,
          items: (itemsResult.data || []) as OrderItem[],
        }
      })
    )

    return ordersWithItems
  } catch (error: any) {
    console.error('[Orders] Error inesperado al obtener pedidos:', error)
    return []
  }
}

/**
 * Actualizar el estado de un pedido
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  additionalData?: {
    payment_status?: Order['payment_status']
    shipped_at?: string
    delivered_at?: string
    cancelled_at?: string
  }
): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Orders] Supabase no configurado')
      return false
    }

    const updateData: any = { status }

    if (status === 'confirmed' && !additionalData?.shipped_at) {
      updateData.confirmed_at = new Date().toISOString()
    }
    if (status === 'shipped') {
      updateData.shipped_at = additionalData?.shipped_at || new Date().toISOString()
    }
    if (status === 'delivered') {
      updateData.delivered_at = additionalData?.delivered_at || new Date().toISOString()
    }
    if (status === 'cancelled') {
      updateData.cancelled_at = additionalData?.cancelled_at || new Date().toISOString()
    }

    if (additionalData?.payment_status) {
      updateData.payment_status = additionalData.payment_status
    }

    // Mapear status al enum del schema
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'processing': 'confirmed', // En el nuevo schema no hay 'processing', usar 'confirmed'
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled'
    }
    const mappedStatus = statusMap[status] || status

    // Actualizar en la tabla real
    const updateDataReal: any = { status: mappedStatus }

    if (mappedStatus === 'confirmed' && !additionalData?.shipped_at) {
      updateDataReal.confirmed_at = new Date().toISOString()
    }
    if (mappedStatus === 'shipped') {
      updateDataReal.shipped_at = additionalData?.shipped_at || new Date().toISOString()
    }
    if (mappedStatus === 'delivered') {
      updateDataReal.delivered_at = additionalData?.delivered_at || new Date().toISOString()
    }
    if (mappedStatus === 'cancelled') {
      updateDataReal.cancelled_at = additionalData?.cancelled_at || new Date().toISOString()
    }

    const ecommerce = supabase.schema('ecommerce')
    const result = await withTimeout(
      ecommerce
        .from('orders')
        .update(updateDataReal)
        .eq('id', orderId),
      10000,
      'updateOrderStatus'
    ) as { error: any }

    // Si hay payment_status, actualizar también en payment_transactions
    if (additionalData?.payment_status) {
      const paymentStatusMap: Record<string, string> = {
        'pending': 'pending',
        'paid': 'paid',
        'failed': 'failed',
        'refunded': 'refunded'
      }
      const mappedPaymentStatus = paymentStatusMap[additionalData.payment_status] || additionalData.payment_status
      
      // Obtener la última transacción de pago
      const { data: lastPayment } = await ecommerce
        .from('payment_transactions')
        .select('id')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (lastPayment?.id) {
        await ecommerce
          .from('payment_transactions')
          .update({ status: mappedPaymentStatus as any })
          .eq('id', lastPayment.id)
      }
    }

    if (result.error) {
      console.error('[Orders] Error al actualizar estado del pedido:', result.error)
      return false
    }

    return true
  } catch (error: any) {
    console.error('[Orders] Error inesperado al actualizar estado:', error)
    return false
  }
}











