import {
  buildOrderLifecycleNotification,
  type OrderLifecycleStatus,
  type OrderOutboxNotification,
} from "@/lib/checkout/order-notifications"
import { ECOMMERCE_FUNCTIONS, ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { loadStoreIdentity } from "@/lib/supabase/store-identity-api"
import type { Order } from "@/lib/supabase/orders-api"

export class OrderStatusNotAuthorizedError extends Error {
  constructor() {
    super("No tienes permisos para cambiar el estado de este pedido")
    this.name = "OrderStatusNotAuthorizedError"
  }
}

export class OrderNotFoundError extends Error {
  constructor() {
    super("El pedido no existe en esta tienda")
    this.name = "OrderNotFoundError"
  }
}

export class InvalidOrderStatusTransitionError extends Error {
  constructor() {
    super("Ese cambio de estado no está permitido")
    this.name = "InvalidOrderStatusTransitionError"
  }
}

export type TransitionOrderStatusInput = {
  supabase: any
  orderId: string
  storeId: string
  userId: string
  nextStatus: Order["status"]
}

const LIFECYCLE_STATUSES = new Set<OrderLifecycleStatus>([
  "shipped",
  "delivered",
  "cancelled",
  "returned",
])

function isLifecycleStatus(status: Order["status"]): status is OrderLifecycleStatus {
  return LIFECYCLE_STATUSES.has(status as OrderLifecycleStatus)
}

// D30: the single call site that replaces the old direct `.update({status})`
// write (lib/supabase/orders-api.ts's updateOrderStatus) behind
// ecommerce.transition_order_status. The frozen D29 graph and the
// authorization/tenant checks live inside that locked function; this
// assembles what it needs BEFORE calling it (D13: the lifecycle message
// renders in TS, never in SQL) and interprets its result -- same shape as
// lib/checkout/order-writer.ts's writeOrderAtomically.
export async function transitionOrderStatusAtomically(input: TransitionOrderStatusInput): Promise<Order> {
  const notification = await buildLifecycleNotificationIfNeeded(input)

  const { data, error } = await input.supabase.rpc(ECOMMERCE_FUNCTIONS.transitionOrderStatus, {
    p_order_id: input.orderId,
    p_store_id: input.storeId,
    p_user_id: input.userId,
    p_next_status: input.nextStatus,
    p_notification: notification,
  })

  if (error) {
    throw new Error(`No se pudo actualizar el estado del pedido: ${error.message ?? error}`)
  }

  return interpretRpcResult(data)
}

// D11: only these four target statuses carry a customer message; every other
// target (in particular confirmed/processing) enqueues nothing, so this
// returns null and the RPC call above receives p_notification: null.
async function buildLifecycleNotificationIfNeeded(
  input: TransitionOrderStatusInput,
): Promise<OrderOutboxNotification | null> {
  if (!isLifecycleStatus(input.nextStatus)) return null

  // fetchOrderSummary itself distinguishes not-found from a transient query
  // error (logging only the latter); either way there's nothing to render a
  // notification from, so this returns null and p_notification stays null.
  const summary = await fetchOrderSummary(input.supabase, input.orderId, input.storeId)
  if (!summary) return null

  const identity = await loadStoreIdentity(input.supabase, input.storeId)

  return buildOrderLifecycleNotification(input.nextStatus, {
    identity,
    orderNumber: summary.orderNumber,
    customerName: summary.customerName,
    customerEmail: summary.customerEmail,
    idempotencyKey: `order-status:${input.orderId}:${input.nextStatus}`,
  })
}

type OrderSummaryForNotification = {
  orderNumber: string
  customerName: string
  customerEmail: string
}

async function fetchOrderSummary(
  supabase: any,
  orderId: string,
  storeId: string,
): Promise<OrderSummaryForNotification | null> {
  const { data, error } = await supabase
    .from(ECOMMERCE_TABLES.orders)
    .select("order_number, customer_first_name, customer_last_name, customer_email")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle()

  if (error) {
    logOrderSummaryFetchFailed(orderId, storeId, error)
    return null
  }
  if (!data) return null // the RPC's own not_found check surfaces the real rejection

  return {
    orderNumber: data.order_number,
    customerName: `${data.customer_first_name ?? ""} ${data.customer_last_name ?? ""}`.trim(),
    customerEmail: data.customer_email,
  }
}

// D36's convention for making an operational shortfall visible (same
// {level, msg, ...} shape lib/checkout/order-notifications.ts's
// logMissingMerchantRecipient and supabase/functions/email-worker use): a
// transient query error here must never take the same silent branch as a
// genuine not-found, or the lifecycle transition commits with the
// customer's shipped/delivered email never enqueued and no trace of why.
function logOrderSummaryFetchFailed(orderId: string, storeId: string, error: unknown): void {
  console.warn(
    JSON.stringify({
      level: "warn",
      msg: "order-status-writer: failed to fetch order summary, lifecycle notification skipped",
      storeId,
      orderId,
      error: (error as { message?: string })?.message ?? String(error),
    }),
  )
}

function interpretRpcResult(data: any): Order {
  if (!data?.ok) {
    switch (data?.reason) {
      case "not_authorized":
        throw new OrderStatusNotAuthorizedError()
      case "not_found":
        throw new OrderNotFoundError()
      case "invalid_transition":
        throw new InvalidOrderStatusTransitionError()
      default:
        throw new Error(`No se pudo actualizar el estado del pedido (${data?.reason ?? "sin motivo"})`)
    }
  }

  return data.order as Order
}
