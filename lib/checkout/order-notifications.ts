import { renderEmail } from "@/lib/email/render"
import { resolveEmailSender } from "@/lib/email/sender"
import type { TenantEmailBranding } from "@/lib/email/types"
import { isStoreIdentityReadinessEnforced } from "@/lib/checkout/identity-readiness-gate"
import { toTenantEmailBranding, type StoreIdentityView } from "@/lib/supabase/store-identity-api"

// D11: the four order-lifecycle kinds ecommerce.transition_order_status can
// enqueue, keyed by the order status they land on. confirmed/processing are
// deliberately absent -- they enqueue nothing (lib/orders/order-status-writer.ts
// never calls buildOrderLifecycleNotification for them).
const ORDER_LIFECYCLE_TEMPLATE_KIND = {
  shipped: "order-shipped",
  delivered: "order-delivered",
  cancelled: "order-cancelled",
  returned: "order-returned",
} as const

export type OrderLifecycleStatus = keyof typeof ORDER_LIFECYCLE_TEMPLATE_KIND

// Shape ecommerce.create_order_with_notifications and
// ecommerce.transition_order_status expect for each notification they're
// handed -- see those migrations' comments for why rendering happens here in
// TS rather than in SQL (D13).
export type OrderOutboxNotification = {
  templateKind:
    | "order-received"
    | "merchant-new-order"
    | (typeof ORDER_LIFECYCLE_TEMPLATE_KIND)[OrderLifecycleStatus]
  recipientEmail: string
  fromAddress: string
  replyToAddress: string | null
  subject: string
  htmlBody: string
  textBody: string
  idempotencyKey: string
}

export type OrderNotificationContext = {
  identity: StoreIdentityView
  storeId: string
  checkoutIdempotencyKey: string
  orderNumber: string
  customerName: string
  customerEmail: string
}

// D12: builds the customer receipt and merchant notification from the SAME
// identity snapshot so both share one branding/sender decision. D31 keeps
// checkout's identity-readiness gate OFF by default, so a store with no
// merchant recipient yet still gets the customer receipt alone -- see
// resolveMerchantRecipient.
export async function buildOrderOutboxNotifications(
  context: OrderNotificationContext,
): Promise<OrderOutboxNotification[]> {
  const branding = toTenantEmailBranding(context.identity)
  const verifiedReplyTo = context.identity.replyToVerifiedAt ? context.identity.replyToEmail : null

  const customerReceipt = await renderNotification({
    templateKind: "order-received",
    branding,
    verifiedReplyTo,
    recipientEmail: context.customerEmail,
    data: { customerName: context.customerName, orderNumber: context.orderNumber },
    idempotencyKey: `checkout:${context.storeId}:${context.checkoutIdempotencyKey}:order-received`,
  })

  const merchantRecipient = resolveMerchantRecipient(context.identity)

  if (!merchantRecipient) {
    if (isStoreIdentityReadinessEnforced()) {
      // Defense in depth: with enforcement on, order-writer.ts's readiness
      // gate already guarantees a verified order mailbox before this
      // function is reached, so this should be unreachable. D7 still forbids
      // a platform fallback or a silent order, so this fails loudly rather
      // than dropping the merchant notification.
      throw new Error("La tienda no tiene un correo de pedidos configurado todavía")
    }

    logMissingMerchantRecipient(context)
    return [customerReceipt]
  }

  const merchantNotification = await renderNotification({
    templateKind: "merchant-new-order",
    branding,
    verifiedReplyTo,
    recipientEmail: merchantRecipient,
    data: { customerName: context.customerName, orderNumber: context.orderNumber },
    idempotencyKey: `checkout:${context.storeId}:${context.checkoutIdempotencyKey}:merchant-new-order`,
  })

  return [customerReceipt, merchantNotification]
}

export type OrderLifecycleNotificationContext = {
  identity: StoreIdentityView
  orderNumber: string
  customerName: string
  customerEmail: string
  idempotencyKey: string
  trackingCode?: string
  returnReason?: string
}

// D11: the ONE customer message a transition into shipped/delivered/cancelled/
// returned carries -- called by lib/orders/order-status-writer.ts for exactly
// those four target statuses, never for confirmed/processing. Unlike
// buildOrderOutboxNotifications' merchant leg, there's no missing-recipient
// case to degrade around: the recipient is always the order's own
// customer_email, a required column set at checkout regardless of the
// store's D31 identity-readiness state, so that gate does not apply here.
export async function buildOrderLifecycleNotification(
  targetStatus: OrderLifecycleStatus,
  context: OrderLifecycleNotificationContext,
): Promise<OrderOutboxNotification> {
  const branding = toTenantEmailBranding(context.identity)
  const verifiedReplyTo = context.identity.replyToVerifiedAt ? context.identity.replyToEmail : null

  return renderNotification({
    templateKind: ORDER_LIFECYCLE_TEMPLATE_KIND[targetStatus],
    branding,
    verifiedReplyTo,
    recipientEmail: context.customerEmail,
    data: {
      customerName: context.customerName,
      orderNumber: context.orderNumber,
      ...(context.trackingCode ? { trackingCode: context.trackingCode } : {}),
      ...(context.returnReason ? { returnReason: context.returnReason } : {}),
    },
    idempotencyKey: context.idempotencyKey,
  })
}

// The verified order mailbox (A8's readiness field) is the intended target;
// store_contact.contact_email predates this feature and is the next
// best-known address while D31 keeps the readiness gate unenforced. A store
// with literally neither (today's default state for most stores) has no
// merchant recipient at all -- the caller decides what that means depending
// on whether enforcement is on.
function resolveMerchantRecipient(identity: StoreIdentityView): string | null {
  return identity.orderMailboxEmail ?? identity.contactEmail
}

// D36's convention for making an operational shortfall visible: the same
// structured JSON line shape supabase/functions/email-worker already emits
// (`{level, msg, ...}`), read the same way (Edge Functions logs / `supabase
// functions logs`) -- no new observability mechanism for this one gap.
function logMissingMerchantRecipient(context: OrderNotificationContext): void {
  console.warn(
    JSON.stringify({
      level: "warn",
      msg: "checkout order-notifications: no merchant recipient configured, enqueuing customer receipt only",
      storeId: context.storeId,
      orderNumber: context.orderNumber,
    }),
  )
}

async function renderNotification(input: {
  templateKind: OrderOutboxNotification["templateKind"]
  branding: TenantEmailBranding
  verifiedReplyTo: string | null
  recipientEmail: string
  data: { customerName: string; orderNumber: string; trackingCode?: string; returnReason?: string }
  idempotencyKey: string
}): Promise<OrderOutboxNotification> {
  const sender = resolveEmailSender(input.templateKind, input.branding.displayName, input.verifiedReplyTo)
  const rendered = await renderEmail({ kind: input.templateKind, branding: input.branding, data: input.data })

  return {
    templateKind: input.templateKind,
    recipientEmail: input.recipientEmail,
    fromAddress: sender.from,
    replyToAddress: sender.replyTo ?? null,
    subject: rendered.subject,
    htmlBody: rendered.html,
    textBody: rendered.text,
    idempotencyKey: input.idempotencyKey,
  }
}
