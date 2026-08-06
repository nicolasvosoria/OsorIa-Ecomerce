import { renderEmail } from "@/lib/email/render"
import { resolveEmailSender } from "@/lib/email/sender"
import type { TenantEmailBranding } from "@/lib/email/types"
import { isStoreIdentityReadinessEnforced } from "@/lib/checkout/identity-readiness-gate"
import type { StoreIdentityView } from "@/lib/supabase/store-identity-api"

// Shape ecommerce.create_order_with_notifications expects for each element of
// p_notifications -- see that migration's comment for why rendering happens
// here in TS rather than in SQL (D13).
export type OrderOutboxNotification = {
  templateKind: "order-received" | "merchant-new-order"
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

// D12: the two commerce events this slice owns -- the customer receipt and
// the merchant notification -- built from the SAME identity snapshot so both
// share one branding/sender decision for this order. D12's "exactly two" is
// the steady state of a READY store (A8/D7): once CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS
// is on, order-writer.ts's readiness gate already rejects an unready store
// BEFORE this is ever called, so every order that reaches here has a
// verified order mailbox and this always returns two. D31 keeps that gate
// OFF today, and the verifier found store_contact starts null-null for
// essentially every real store (no live write path ever sets contact_email,
// and the mailbox-verification flow is brand new) -- so while the gate is
// off, a store with no merchant recipient at all must still be able to sell.
// It gets the customer receipt alone; see resolveMerchantRecipient.
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

// The verified order mailbox (A8's readiness field) is the intended target;
// store_contact.contact_email predates this feature and is the next
// best-known address while D31 keeps the readiness gate unenforced. A store
// with literally neither (the default state today, per the verifier) has no
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

function toTenantEmailBranding(identity: StoreIdentityView): TenantEmailBranding {
  return {
    displayName: identity.displayName ?? "",
    validatedSubdomain: identity.subdomain,
    primaryColor: identity.primaryColor ?? "",
    commercialAddress: identity.commercialAddress ?? "",
    ...(identity.logoUrl ? { logoUrl: identity.logoUrl } : {}),
    ...(identity.contactEmail ? { contactEmail: identity.contactEmail } : {}),
    ...(identity.phone ? { contactPhone: identity.phone } : {}),
  }
}

async function renderNotification(input: {
  templateKind: "order-received" | "merchant-new-order"
  branding: TenantEmailBranding
  verifiedReplyTo: string | null
  recipientEmail: string
  data: { customerName: string; orderNumber: string }
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
