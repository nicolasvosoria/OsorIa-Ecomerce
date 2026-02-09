import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOrderById } from "@/lib/supabase/orders-api"
import { formatPrice } from "@/lib/shopify/utils"

/**
 * API Route para enviar correo de confirmación con factura
 *
 * Configuración requerida en variables de entorno (.env.local):
 * - SMTP_HOST: Servidor SMTP (ej: smtp.gmail.com)
 * - SMTP_PORT: Puerto SMTP (ej: 587)
 * - SMTP_USER: Usuario/email del remitente
 * - SMTP_PASS: Contraseña o app password del remitente
 * - SMTP_FROM: Email y nombre del remitente (ej: "Tienda <tienda@ejemplo.com>")
 *
 * Para Gmail:
 * 1. Activa la verificación en 2 pasos
 * 2. Genera una "Contraseña de aplicación" en https://myaccount.google.com/apppasswords
 * 3. Usa esa contraseña en SMTP_PASS
 */

/**
 * GET (solo desarrollo): devuelve el HTML del correo de confirmación con el último pedido.
 * Abre en el navegador: http://localhost:3000/api/orders/send-confirmation-email
 * para ver y corregir el diseño sin hacer un pedido.
 *
 * Iconos en producción (Vercel): las imágenes del correo (logo, ubicación, redes, etc.)
 * usan la URL base de la petición (x-forwarded-host/proto) para que carguen al abrir el email.
 * Si no se ven, definir NEXT_PUBLIC_APP_URL en Vercel (ej. https://tu-dominio.vercel.app).
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Solo disponible en desarrollo" }, { status: 404 })
  }
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return new NextResponse(
        "<html><body><p>Variables de Supabase no configuradas.</p></body></html>",
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
    if (error || !orders?.length) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; padding: 2rem;"><h1>Vista previa del correo</h1><p>No hay pedidos en la base de datos. Haz un pedido de prueba y vuelve a abrir esta URL para ver el HTML del correo.</p><p><a href="/">Ir al inicio</a></p></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }
    const order = await getOrderById(orders[0].id)
    if (!order) {
      return new NextResponse(
        "<html><body><p>No se pudo cargar el pedido.</p></body></html>",
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }
    const customerName = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ") || undefined
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "http"
    const origin = host ? `${protocol}://${host}` : ""
    const html = generateInvoiceEmailHTML(order, customerName, origin)
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch (err: any) {
    console.error("Error en vista previa del correo:", err)
    return new NextResponse(
      `<html><body><p>Error: ${err?.message || "interno"}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, orderNumber, customerEmail, customerName } = body

    if (!orderId || !orderNumber || !customerEmail) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      )
    }

    // Obtener información completa del pedido
    const order = await getOrderById(orderId)

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }

    // URL base para imágenes del correo: desde la petición (Vercel/producción) o env
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const requestOrigin = host ? `${protocol}://${host}` : ""
    const baseUrlForEmail = requestOrigin || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

    // Generar HTML del correo con la factura (baseUrl para que los iconos se vean en producción)
    const emailHtml = generateInvoiceEmailHTML(order, customerName, baseUrlForEmail)

    // Intentar enviar el correo
    const emailSent = await sendEmail({
      to: customerEmail,
      subject: `Confirmación de Pedido #${orderNumber}`,
      html: emailHtml,
    })

    if (!emailSent.success) {
      console.error("Error al enviar correo:", emailSent.error)
      // No fallar el proceso del pedido si el correo falla
      // Pero registrar el error para revisión
      return NextResponse.json({
        success: false,
        message: "Pedido creado pero el correo no pudo ser enviado",
        error: emailSent.error,
        warning: "El pedido fue procesado correctamente, pero el correo de confirmación no pudo ser enviado. Por favor contacta al soporte.",
      }, { status: 200 }) // Retornar 200 para no bloquear el flujo
    }

    console.log("✅ Correo de confirmación enviado a:", customerEmail)

    return NextResponse.json({
      success: true,
      message: "Correo de confirmación enviado exitosamente",
    })

  } catch (error: any) {
    console.error("Error en send-confirmation-email:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

/**
 * Calcula rango de fechas estimado de entrega (7-18 días hábiles desde la fecha del pedido)
 */
function getEstimatedDeliveryRange(orderDate: string): { daysText: string; rangeText: string } {
  const start = new Date(orderDate)
  const addBusinessDays = (date: Date, days: number) => {
    const d = new Date(date)
    let added = 0
    while (added < days) {
      d.setDate(d.getDate() + 1)
      const day = d.getDay()
      if (day !== 0 && day !== 6) added++
    }
    return d
  }
  const fromDate = addBusinessDays(start, 7)
  const toDate = addBusinessDays(start, 18)
  const fmt = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
  return {
    daysText: "7-18 días hábiles",
    rangeText: `${fmt(fromDate)}-${fmt(toDate)}`,
  }
}

/**
 * Genera el HTML del correo con diseño OSORIA (Pedido confirmado)
 * @param baseUrlOverride - URL base para imágenes/links (ej. en vista previa desde GET)
 */
function generateInvoiceEmailHTML(order: any, customerName?: string, baseUrlOverride?: string): string {
  const name = customerName || `${order.customer_first_name || ""} ${order.customer_last_name || ""}`.trim() || "Cliente"
  const orderDateStr = order.order_date || order.created_at
  const orderDate = new Date(orderDateStr)
  const confirmadoFecha = orderDate.toLocaleDateString("es-CO", { day: "numeric", month: "long" })
  const { daysText, rangeText } = getEstimatedDeliveryRange(orderDateStr)
  const baseUrl = baseUrlOverride || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  const verPedidoUrl = baseUrl ? `${baseUrl}/checkout/success?order=${order.order_number}` : "#"
  const logoUrl = baseUrl ? `${baseUrl}/logo-negro.png` : ""
  // Iconos de método de pago, ubicación y redes sociales: www.flaticon.es
  const paymentIconUrl = baseUrl ? `${baseUrl}/icon-metodo-pago.png` : ""
  const ubicacionIconUrl = baseUrl ? `${baseUrl}/icon-ubicacion.png` : ""
  const facebookIconUrl = baseUrl ? `${baseUrl}/icon-facebook.png` : ""
  const instagramIconUrl = baseUrl ? `${baseUrl}/icon-instagram.png` : ""
  const paymentLabel = order.payment_method === "credit_card" || order.payment_method === "debit_card" ? "Tarjeta" : order.payment_method === "cash_on_delivery" ? "Contra entrega" : getPaymentLabel(order.payment_method) || "Pago"

  const productRows = (order.items || []).map(
    (item: any) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee; vertical-align: top;">
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="width: 72px; vertical-align: top;">
              ${item.product_image_url
                ? `<img src="${item.product_image_url}" alt="" width="72" height="72" style="display: block; border-radius: 6px; object-fit: cover; background: #f0f0f0;" />`
                : `<div style="width: 72px; height: 72px; background: #e5e5e5; border-radius: 6px;"></div>`}
            </td>
            <td style="padding-left: 12px;">
              <div style="font-weight: 500; color: #111;">${item.product_name || "Producto"}</div>
              ${item.product_sku ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">SKU ${item.product_sku}</div>` : ""}
              <div style="font-size: 14px; color: #333; margin-top: 4px;">${formatPrice(item.unit_price?.toString() || "0", item.currency_code || order.currency_code)} / x${item.quantity || 1}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  ).join("")

  return `
<!DOCTYPE html>
    <html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido confirmado #${order.order_number}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #111; margin: 0; padding: 0; background: #f0f0f0;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f0f0f0; padding: 24px 0;">
    <tr>
      <td align="center" style="padding: 0 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="padding: 24px 24px 16px; border-bottom: 1px solid #eee;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>${logoUrl ? `<img src="${logoUrl}" alt="OSORIA" width="180" height="28" style="display: block; border: 0; outline: none;" />` : `<span style="font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #111;">OSOR</span><span style="display: inline-block; width: 28px; height: 28px; line-height: 26px; text-align: center; background: #111; color: #fff; border-radius: 6px; font-size: 18px; font-weight: 700; vertical-align: middle;">A</span><span style="font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #111;">IA</span>`}</td>
                  <td align="right" style="font-size: 13px; color: #9ca3af;">Pedido confirmado</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #111;">Hola, ${name},</p>
              <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">
                ¡Tu pedido está confirmado! Estamos preparando tu pedido para enviarlo. Te notificaremos cuando lo enviemos. Vuelve a verificar rápidamente que la dirección sea correcta y esté completa (p. ej., que incluya el número de casa), ya que no se puede cambiar una vez enviado el pedido.
              </p>
              <p style="margin: 0 0 6px; font-size: 13px; color: #6b7280;">Enviar a:</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 8px;">
                <tr>
                  <td style="background: #dcfce7; border-radius: 8px; padding: 12px 14px; border: 1px solid #bbf7d0;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align: top; padding-right: 8px;">${ubicacionIconUrl ? `<img src="${ubicacionIconUrl}" alt="Ubicación" width="20" height="20" style="display: block; border: 0;" />` : `<span style="font-size: 16px;">📍</span>`}</td><td style="font-size: 14px; color: #166534;">${order.shipping_address || ""}<br>${order.shipping_city || ""} ${order.shipping_postal_code || ""} ${order.shipping_country || "Colombia"}</td></tr></table>
                  </td>
                </tr>
              </table>
              ${baseUrl ? `<p style="margin: 0 0 20px;"><a href="${baseUrl}/checkout/success?order=${order.order_number}" style="font-size: 13px; color: #16a34a; text-decoration: none;">Cambiar dirección</a></p>` : ""}

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <table cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed;">
                      <tr>
                        <td style="width: 72px; vertical-align: top; padding-bottom: 4px;" align="center"><span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: #7cb342; color: #fff; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold;">✓</span></td>
                        <td style="width: 50px; padding: 11px 0 0; vertical-align: top;"><div style="width: 100%; height: 2px; background: #7cb342;"></div></td>
                        <td style="width: 72px; vertical-align: top; padding-bottom: 4px;" align="center"><span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #7cb342; background: #fff;"></span></td>
                        <td style="width: 50px; padding: 11px 0 0; vertical-align: top;"><div style="width: 100%; height: 2px; background: #7cb342;"></div></td>
                        <td style="width: 72px; vertical-align: top; padding-bottom: 4px;" align="center"><span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #7cb342; background: #fff;"></span></td>
                        <td style="width: 50px; padding: 11px 0 0; vertical-align: top;"><div style="width: 100%; height: 2px; background: #7cb342;"></div></td>
                        <td style="width: 72px; vertical-align: top; padding-bottom: 4px;" align="center"><span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #7cb342; background: #fff;"></span></td>
                      </tr>
                      <tr>
                        <td style="width: 72px; font-size: 13px; color: #374151; font-weight: 600; padding-top: 2px; line-height: 1.3;" align="center" valign="top">Confirmado<br><span style="font-size: 11px; font-weight: normal; color: #6b7280;">${confirmadoFecha}</span></td>
                        <td style="width: 50px;"></td>
                        <td style="width: 72px; font-size: 13px; color: #374151; padding-top: 2px;" align="center" valign="top">Enviado</td>
                        <td style="width: 50px;"></td>
                        <td style="width: 72px; font-size: 13px; color: #374151; padding-top: 2px;" align="center" valign="top">En camino</td>
                        <td style="width: 50px;"></td>
                        <td style="width: 72px; font-size: 13px; color: #374151; padding-top: 2px; line-height: 1.3;" align="center" valign="top">Entregado<br><span style="font-size: 11px; font-weight: normal; color: #6b7280;">7 - 8 días hábiles</span></td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 1%; white-space: nowrap; padding: 8px 0 8px 16px; vertical-align: top;" align="right"><a href="${verPedidoUrl}" style="display: inline-block; background: #7cb342; color: #fff; padding: 12px 32px; border-radius: 9999px; text-decoration: none; font-weight: 500; font-size: 14px;">Ver pedido</a></td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; font-size: 13px; color: #6b7280;">Entrega: ${daysText} (${rangeText})</p>

              <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">ID del pedido: <strong>${order.order_number || order.id}</strong></p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                ${productRows || "<tr><td style='padding: 12px 0; color: #6b7280; font-size: 14px;'>No hay productos en este pedido.</td></tr>"}
              </table>
              <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af;">Método de pago:</p>
              <div style="height: 1px; background: #e5e7eb; margin-bottom: 12px;"></div>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 12px;">
                <tr>
                  <td style="padding: 0; vertical-align: middle;">
                    ${paymentIconUrl ? `<img src="${paymentIconUrl}" alt="Método de pago" width="44" height="40" style="display: inline-block; vertical-align: middle; margin-right: 12px; border: 0;" />` : `<span style="display: inline-block; width: 44px; height: 40px; background: #111; border-radius: 4px; vertical-align: middle; margin-right: 12px;"></span>`}
                    <span style="font-size: 14px; color: #111; vertical-align: middle;">${paymentLabel}</span>
                  </td>
                  <td style="padding: 0; text-align: right; font-size: 14px; color: #111; font-weight: 600; vertical-align: middle;">${formatPrice(order.total_amount?.toString() || "0", order.currency_code)}</td>
                </tr>
              </table>
              <div style="height: 1px; background: #e5e7eb; margin-bottom: 12px;"></div>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr><td style="padding: 8px 0; font-size: 14px; color: #9ca3af;">Total de artículos</td><td style="padding: 8px 0; text-align: right; width: 110px; font-size: 14px; color: #111;">${formatPrice(order.subtotal?.toString() || "0", order.currency_code)}</td></tr>
                <tr><td colspan="2" style="padding: 0;"><div style="height: 1px; background: #e5e7eb;"></div></td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: #9ca3af;">Envío</td><td style="padding: 8px 0; text-align: right; font-size: 14px; color: #111;">${Number(order.shipping_cost) > 0 ? formatPrice(order.shipping_cost.toString(), order.currency_code) : "GRATIS"}</td></tr>
                <tr><td colspan="2" style="padding: 0;"><div style="height: 1px; background: #e5e7eb;"></div></td></tr>
                <tr><td style="padding: 12px 0 0; font-size: 16px; font-weight: 700; color: #111;">Total del pedido:</td><td style="padding: 12px 0 0; text-align: right; font-size: 16px; font-weight: 700; color: #111;">${formatPrice(order.total_amount?.toString() || "0", order.currency_code)}</td></tr>
                <tr><td colspan="2" style="padding: 0;"><div style="height: 1px; background: #e5e7eb; margin-top: 12px;"></div></td></tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #111; text-align: center;">¿Tienes preguntas o necesitas ayuda?</p>
              <p style="margin: 0 0 24px; text-align: center;">
                <a href="${baseUrl || "#"}" style="display: inline-block; margin: 0 4px; padding: 10px 18px; border: 1px solid #d1d5db; border-radius: 9999px; color: #111; text-decoration: none; font-size: 13px; background: #fff;">Cancelar / Más ayuda</a>
                <a href="${baseUrl || "#"}" style="display: inline-block; margin: 0 4px; padding: 10px 18px; border: 1px solid #d1d5db; border-radius: 9999px; color: #111; text-decoration: none; font-size: 13px; background: #fff;">Ayuda</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-align: center;">Encuéntranos en</p>
              <p style="margin: 0 0 24px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_FACEBOOK_URL || "#"}" style="display: inline-block; margin-right: 10px; text-decoration: none;">${facebookIconUrl ? `<img src="${facebookIconUrl}" alt="Facebook" width="36" height="36" style="display: block; border: 0;" />` : `<span style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: #111; color: #fff; border-radius: 50%; font-size: 14px; font-weight: 600;">f</span>`}</a>
                <a href="${process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"}" style="display: inline-block; text-decoration: none;">${instagramIconUrl ? `<img src="${instagramIconUrl}" alt="Instagram" width="36" height="36" style="display: block; border: 0;" />` : `<span style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: #111; color: #fff; border-radius: 50%; font-size: 14px;">📷</span>`}</a>
              </p>
              <div style="text-align: center; margin-top: 16px;">
                <p style="margin: 0 0 2px; font-size: 11px; line-height: 1.25; font-weight: 600; color: #9ca3af;">NOTA: Este es un email generado automáticamente, no lo respondas.</p>
                <p style="margin: 0 0 2px; font-size: 11px; line-height: 1.25; font-weight: 600; color: #9ca3af;">Iconos de ubicación, método de pago y redes: <a href="https://www.flaticon.es" style="color: #9ca3af; text-decoration: none; font-weight: 600;">www.flaticon.es</a></p>
                <p style="margin: 0 0 2px; font-size: 11px; line-height: 1.25; font-weight: 600; color: #9ca3af;">Dirección de la oficina: 6 Raffles Quay, #14-06, Singapore (Postal 048580)</p>
                <p style="margin: 0; font-size: 11px; line-height: 1.25; font-weight: 600; color: #9ca3af;">Ten en cuenta que las devoluciones no se aceptarán en esta dirección. Si deseas devolver artículos, solicita una devolución y utiliza la etiqueta correspondiente. <a href="${baseUrl || "#"}" style="color: #16a34a; text-decoration: none; font-weight: 600;">Haz clic para ver más detalles</a>.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Convierte el estado del pedido a un label legible
 */
function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    processing: "En Proceso",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
  }
  return statusMap[status] || status
}

/**
 * Convierte el método de pago a un label legible
 */
function getPaymentLabel(method: string | null | undefined): string {
  if (!method) return "Pago"
  const map: Record<string, string> = {
    credit_card: "Tarjeta",
    debit_card: "Tarjeta",
    cash_on_delivery: "Contra entrega",
    transfer: "Transferencia",
  }
  return map[method] || method
}

/**
 * Envía un correo electrónico usando SMTP con nodemailer
 */
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que las variables de entorno estén configuradas
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser || "noreply@tutienda.com"

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("⚠️ Variables SMTP no configuradas. El correo no se enviará.")
      console.warn("Configura en .env.local:")
      console.warn("  SMTP_HOST=smtp.gmail.com (o tu servidor SMTP)")
      console.warn("  SMTP_PORT=587")
      console.warn("  SMTP_USER=tu-email@gmail.com")
      console.warn("  SMTP_PASS=tu-contraseña-de-aplicacion")
      console.warn("  SMTP_FROM=\"Tu Tienda <tu-email@gmail.com>\"")
      
      // En desarrollo, guardar el HTML en un archivo para revisión
      if (process.env.NODE_ENV === "development") {
        try {
          const fs = await import("fs")
          const path = await import("path")
          const emailDir = path.join(process.cwd(), "tmp")
          if (!fs.existsSync(emailDir)) {
            fs.mkdirSync(emailDir, { recursive: true })
          }
          const emailPath = path.join(emailDir, `email-${Date.now()}.html`)
          fs.writeFileSync(emailPath, html, "utf-8")
          console.log(`\n📧 HTML del correo guardado en: ${emailPath}`)
          console.log(`   Para: ${to}`)
          console.log(`   Asunto: ${subject}\n`)
        } catch (fsError) {
          console.log("\n📧 CONTENIDO DEL CORREO QUE SE ENVIARÍA:")
          console.log(`   Para: ${to}`)
          console.log(`   Asunto: ${subject}`)
        }
      }
      
      return {
        success: false,
        error: "Configuración SMTP no encontrada. Ver instrucciones en la consola del servidor.",
      }
    }

    // Intentar importar nodemailer dinámicamente
    let nodemailer: typeof import("nodemailer") | null = null
    try {
      nodemailer = await import("nodemailer")
    } catch (importError) {
      console.error("❌ nodemailer no está instalado. Ejecuta: npm install nodemailer @types/nodemailer")
      return { success: false, error: "nodemailer no está instalado. Por favor instala las dependencias necesarias." }
    }

    if (!nodemailer) {
      return { success: false, error: "nodemailer no está disponible." }
    }

    // Crear transporter
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465, // true para 465, false para otros puertos
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Verificar conexión
    await transporter.verify()

    // Enviar correo
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: to,
      subject: subject,
      html: html,
    })

    console.log("✅ Correo enviado exitosamente:", info.messageId)
    return { success: true }
  } catch (error: any) {
    console.error("❌ Error al enviar correo:", error.message || error)
    return {
      success: false,
      error: error.message || "Error desconocido al enviar correo",
    }
  }
}

