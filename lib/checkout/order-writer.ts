import { buildOrderOutboxNotifications } from "@/lib/checkout/order-notifications"
import { isStoreIdentityReadinessEnforced } from "@/lib/checkout/identity-readiness-gate"
import type { OrderReceiptDetails } from "@/lib/email/types"
import { getStoreIdentityReadiness, type StoreIdentityField } from "@/lib/stores/identity-readiness"
import { ECOMMERCE_FUNCTIONS } from "@/lib/supabase/contract"
import { loadStoreIdentity, type StoreIdentityView } from "@/lib/supabase/store-identity-api"
import type { CreateOrderData, Order, OrderItem } from "@/lib/supabase/orders-api"

export class StoreIdentityNotReadyError extends Error {
  readonly missingFields: StoreIdentityField[]

  constructor(missingFields: StoreIdentityField[]) {
    super("La tienda todavía no completó su identidad de correo")
    this.name = "StoreIdentityNotReadyError"
    this.missingFields = missingFields
  }
}

export class CheckoutIdempotencyConflictError extends Error {
  constructor() {
    super("Ya existe un pedido distinto para esta misma solicitud")
    this.name = "CheckoutIdempotencyConflictError"
  }
}

export type AtomicOrderWrite = {
  order: Order
  items: OrderItem[]
  replayed: boolean
}

export type WriteOrderAtomicallyInput = {
  supabase: any
  storeId: string
  idempotencyKey: string
  payloadFingerprint: string
  header: CreateOrderData
}

// D27: the single call site that replaces the old two-request "insert
// header, then insert items" write behind ecommerce.create_order_with_notifications.
// Everything the RPC needs -- the store's identity (for the D7/A8 gate and
// D3's sender), a real order_number, and the two D12 notifications rendered
// in TS (D13: SQL can't render React) -- is assembled here BEFORE the call,
// so the RPC itself only ever receives fully-formed data and never reaches
// back into TS mid-transaction.
export async function writeOrderAtomically(input: WriteOrderAtomicallyInput): Promise<AtomicOrderWrite> {
  const identity = await loadStoreIdentity(input.supabase, input.storeId)
  assertStoreIdentityReadyIfEnforced(identity)

  const orderNumber = await reserveOrderNumber(input.supabase, input.storeId)
  const notifications = await buildOrderOutboxNotifications({
    identity,
    storeId: input.storeId,
    checkoutIdempotencyKey: input.idempotencyKey,
    orderNumber,
    customerName: `${input.header.customer_first_name} ${input.header.customer_last_name}`.trim(),
    customerEmail: input.header.customer_email,
    receipt: buildOrderReceiptDetails(input.header),
  })

  const { data, error } = await input.supabase.rpc(ECOMMERCE_FUNCTIONS.createOrderWithNotifications, {
    p_store_id: input.storeId,
    p_idempotency_key: input.idempotencyKey,
    p_payload_fingerprint: input.payloadFingerprint,
    p_order: { ...toOrderHeaderPayload(input.header), order_number: orderNumber },
    p_items: input.header.items,
    p_notifications: notifications,
  })

  if (error) {
    throw new Error(`No se pudo crear el pedido: ${error.message ?? error}`)
  }

  return interpretRpcResult(data)
}

function assertStoreIdentityReadyIfEnforced(identity: StoreIdentityView): void {
  if (!isStoreIdentityReadinessEnforced()) return

  const readiness = getStoreIdentityReadiness(identity)
  if (!readiness.ready) {
    throw new StoreIdentityNotReadyError(readiness.missingFields)
  }
}

// D13 needs the real order_number before rendering, and the trigger that
// normally assigns it (ecommerce.set_order_number_before_insert) only fires
// inside the atomic RPC's own insert -- so it's reserved here, one statement
// ahead, via the SAME advisory-lock-protected function that trigger already
// calls (ecommerce.generate_order_number), reused rather than reimplemented.
// The reservation and the insert are two separate statements: a concurrent
// checkout on the SAME store in the same instant could in theory reserve the
// same candidate, and ecommerce.orders' (store_id, order_number) unique
// constraint then makes ONE of the two atomic RPC calls fail outright --
// a clean rollback (D27 still holds, nothing partial lands), and that
// shopper's retry reserves a fresh number.
async function reserveOrderNumber(supabase: any, storeId: string): Promise<string> {
  const { data, error } = await supabase.rpc(ECOMMERCE_FUNCTIONS.generateOrderNumber, { p_store_id: storeId })
  if (error || !data) {
    throw new Error(`No se pudo generar el número de pedido: ${error?.message ?? "sin dato"}`)
  }
  return data as string
}

// D12/D26: the confirmation email's breakdown, read straight off the header
// createOrder already resolved (recalculated subtotal, S9's shipping
// resolution, the total the DB's own reconciliation check will also see) --
// never recomputed here, so the receipt can't drift from the order it
// describes. currency_code is optional on CreateOrderData; app/checkout's
// own action already derives it from the first item's price (the same
// fallback orders-api.ts uses elsewhere), repeated here as the last resort.
function buildOrderReceiptDetails(header: CreateOrderData): OrderReceiptDetails {
  return {
    currencyCode: header.currency_code ?? header.items[0]?.currency_code ?? "COP",
    lines: header.items.map((item) => ({
      productName: item.product_name,
      variantTitle: item.variant_title,
      quantity: item.quantity,
      totalPrice: item.total_price,
    })),
    subtotal: header.subtotal,
    shippingCost: header.shipping_cost ?? 0,
    shippingStatus: header.shipping_status ?? null,
    totalAmount: header.total_amount,
  }
}

// idempotency_key/payload_fingerprint travel as their own top-level RPC
// params (p_idempotency_key/p_payload_fingerprint), and items as p_items --
// p_order carries only the header columns ecommerce.create_order_with_notifications
// reads via p_order->>'...'.
function toOrderHeaderPayload(
  header: CreateOrderData,
): Omit<CreateOrderData, "items" | "idempotency_key" | "payload_fingerprint"> {
  const rest: Partial<CreateOrderData> = { ...header }
  delete rest.items
  delete rest.idempotency_key
  delete rest.payload_fingerprint
  return rest as Omit<CreateOrderData, "items" | "idempotency_key" | "payload_fingerprint">
}

function interpretRpcResult(data: any): AtomicOrderWrite {
  if (!data?.ok) {
    if (data?.reason === "idempotency_conflict") {
      throw new CheckoutIdempotencyConflictError()
    }
    throw new Error(`No se pudo crear el pedido (${data?.reason ?? "sin motivo"})`)
  }

  return {
    order: data.order as Order,
    items: (data.items ?? []) as OrderItem[],
    replayed: Boolean(data.replayed),
  }
}
