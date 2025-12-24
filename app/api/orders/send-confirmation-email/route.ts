import { NextRequest, NextResponse } from "next/server"
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

    // Generar HTML del correo con la factura
    const emailHtml = generateInvoiceEmailHTML(order, customerName)

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
 * Genera el HTML del correo con la factura
 */
function generateInvoiceEmailHTML(order: any, customerName?: string): string {
  const orderDate = new Date(order.order_date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido #${order.order_number}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin: 0 0 10px 0;">¡Gracias por tu compra!</h1>
        <p style="margin: 0; color: #666;">Tu pedido ha sido confirmado exitosamente.</p>
      </div>

      <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Detalles del Pedido</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Número de Pedido:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">#${order.order_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Fecha:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${orderDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Estado:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
              <span style="background-color: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${getStatusLabel(order.status)}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Información del Cliente</h2>
        <p style="margin: 5px 0;"><strong>Nombre:</strong> ${customerName || `${order.customer_first_name} ${order.customer_last_name}`}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${order.customer_email}</p>
        ${order.customer_phone ? `<p style="margin: 5px 0;"><strong>Teléfono:</strong> ${order.customer_phone}</p>` : ""}
      </div>

      <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Dirección de Envío</h2>
        <p style="margin: 5px 0;">
          ${order.shipping_address}<br>
          ${order.shipping_city}, ${order.shipping_postal_code}<br>
          ${order.shipping_country}
        </p>
      </div>

      <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Productos</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Cantidad</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Precio</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map((item: any) => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                  ${item.product_name}
                  ${item.variant_title ? `<br><small style="color: #666;">${item.variant_title}</small>` : ""}
                </td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">
                  ${formatPrice(item.unit_price.toString(), item.currency_code || order.currency_code)}
                </td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">
                  ${formatPrice(item.total_price.toString(), item.currency_code || order.currency_code)}
                </td>
              </tr>
            `).join("") || ""}
          </tbody>
        </table>
      </div>

      <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="padding: 8px 0; text-align: right; width: 120px;">
              ${formatPrice(order.subtotal.toString(), order.currency_code)}
            </td>
          </tr>
          ${order.shipping_cost > 0 ? `
          <tr>
            <td style="padding: 8px 0; text-align: right;"><strong>Envío:</strong></td>
            <td style="padding: 8px 0; text-align: right;">
              ${formatPrice(order.shipping_cost.toString(), order.currency_code)}
            </td>
          </tr>
          ` : ""}
          ${order.tax_amount > 0 ? `
          <tr>
            <td style="padding: 8px 0; text-align: right;"><strong>Impuestos:</strong></td>
            <td style="padding: 8px 0; text-align: right;">
              ${formatPrice(order.tax_amount.toString(), order.currency_code)}
            </td>
          </tr>
          ` : ""}
          ${order.discount_amount > 0 ? `
          <tr>
            <td style="padding: 8px 0; text-align: right;"><strong>Descuento:</strong></td>
            <td style="padding: 8px 0; text-align: right; color: #27ae60;">
              -${formatPrice(order.discount_amount.toString(), order.currency_code)}
            </td>
          </tr>
          ` : ""}
          <tr style="border-top: 2px solid #2c3e50;">
            <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 18px;">Total:</strong></td>
            <td style="padding: 12px 0; text-align: right;">
              <strong style="font-size: 18px; color: #2c3e50;">
                ${formatPrice(order.total_amount.toString(), order.currency_code)}
              </strong>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.
        </p>
        <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
          ¡Gracias por tu compra!
        </p>
      </div>
    </body>
    </html>
  `
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
    let nodemailer
    try {
      nodemailer = await import("nodemailer")
    } catch (importError) {
      console.error("❌ nodemailer no está instalado. Ejecuta: npm install nodemailer @types/nodemailer")
      return {
        success: false,
        error: "nodemailer no está instalado. Por favor instala las dependencias necesarias.",
      }
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

