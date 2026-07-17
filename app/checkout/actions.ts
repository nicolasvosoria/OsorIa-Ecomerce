"use server"

import { headers } from "next/headers"
import { after } from "next/server"

import { checkoutOrderSchema } from "@/lib/checkout/schemas"
import {
  generateInvoiceEmailHTML,
  sendEmail,
} from "@/lib/orders/order-confirmation-email"
import { resolveEmailBaseUrl } from "@/lib/security/email-runtime-guards"
import {
  createOrder,
  getMostRecentOrderByUserId,
  type CreateOrderData,
  type InventoryValidationResult,
  type OrderWithItems,
} from "@/lib/supabase/orders-api"
import { resolveServerAuthSession } from "@/lib/supabase/server-auth-session"
import { getServiceEcommerceClient } from "@/lib/supabase/service-client"

export type PlaceCheckoutOrderResult =
  | { success: true; orderNumber: string; orderId: string }
  | { success: false; error: string; validationResult?: InventoryValidationResult }

export type CheckoutPrefill = { phone: string; address: string } | null

export async function placeCheckoutOrder(
  input: unknown,
): Promise<PlaceCheckoutOrderResult> {
  const parsed = checkoutOrderSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Los datos del pedido no son válidos. Revisa el formulario e intenta de nuevo.",
    }
  }

  const authenticatedUserId = await resolveAuthenticatedUserId()
  // customer_type/user_id salen de la sesión y el pago nace pendiente, diga lo
  // que diga el cliente: la action escribe con el service client (bypasea RLS)
  // y los totales los recalcula createOrder contra la base de datos.
  const orderData: CreateOrderData = {
    ...parsed.data,
    customer_type: authenticatedUserId ? "user" : "guest",
    user_id: authenticatedUserId,
    payment_status: "pending",
    payment_reference: undefined,
    subtotal: 0,
    total_amount: 0,
    currency_code: parsed.data.items[0]?.currency_code,
  }

  const serviceClient = getServiceEcommerceClient()
  if (!serviceClient) {
    return { success: false, error: "Supabase service role no configurado" }
  }

  try {
    const order = await createOrder(orderData, serviceClient)
    if (!order) {
      return { success: false, error: "No se pudo crear el pedido" }
    }

    const requestOrigin = await resolveRequestOrigin()
    after(() => sendOrderConfirmationEmail(order, requestOrigin))

    return { success: true, orderNumber: order.order_number, orderId: order.id }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Error inesperado al crear pedido",
      ...(error?.validationResult
        ? { validationResult: error.validationResult as InventoryValidationResult }
        : {}),
    }
  }
}

export async function getCheckoutPrefill(): Promise<CheckoutPrefill> {
  const session = await resolveServerAuthSession()
  if (!session) {
    return null
  }

  const lastOrder = await getMostRecentOrderByUserId(session.userId, session.client)
  if (!lastOrder) {
    return null
  }

  return {
    phone: lastOrder.customer_phone || "",
    address: lastOrder.shipping_address || "",
  }
}

async function resolveAuthenticatedUserId(): Promise<string | null> {
  const session = await resolveServerAuthSession()
  return session?.userId ?? null
}

async function resolveRequestOrigin(): Promise<string> {
  const requestHeaders = await headers()
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host")
  const protocol = requestHeaders.get("x-forwarded-proto") || "https"
  return host ? `${protocol}://${host}` : ""
}

// Corre tras responder (after()) y es best-effort: un fallo del correo jamás
// tumba el pedido ya creado.
async function sendOrderConfirmationEmail(
  order: OrderWithItems,
  requestOrigin: string,
) {
  try {
    const baseUrlForEmail = resolveEmailBaseUrl({
      requestOrigin,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      vercelUrl: process.env.VERCEL_URL,
    })

    const customerName =
      [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(" ") || undefined
    const emailHtml = generateInvoiceEmailHTML(order, customerName, baseUrlForEmail)

    const emailSent = await sendEmail({
      to: order.customer_email,
      subject: `Confirmación de Pedido #${order.order_number}`,
      html: emailHtml,
    })

    if (!emailSent.success) {
      console.error("Error al enviar correo de confirmación:", emailSent.error)
    }
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error)
  }
}
