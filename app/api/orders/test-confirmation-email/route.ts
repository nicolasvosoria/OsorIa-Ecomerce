import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { getOrderById } from "@/lib/supabase/orders-api"
import {
  generateInvoiceEmailHTML,
  sendEmail,
} from "@/lib/orders/order-confirmation-email"

/**
 * GET /api/orders/test-confirmation-email?to=email@ejemplo.com
 *
 * Solo en desarrollo. Obtiene el último pedido y envía el correo de confirmación
 * al email indicado (o al email del cliente del pedido).
 * Sirve para comprobar que el envío de correos funciona sin hacer un pedido real.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Esta ruta solo está disponible en desarrollo" },
      { status: 404 }
    )
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Variables de Supabase no configuradas" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey).schema(ECOMMERCE_SCHEMA)
    const { data: orders, error: orderError } = await supabase
      .from(ECOMMERCE_TABLES.orders)
      .select("id, store_id")
      .order("created_at", { ascending: false })
      .limit(1)

    if (orderError || !orders?.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "No hay pedidos en la base de datos. Haz un pedido de prueba primero.",
        },
        { status: 200 }
      )
    }

    const order = await getOrderById(orders[0].id, orders[0].store_id)
    if (!order) {
      return NextResponse.json(
        { ok: false, message: "No se pudo cargar el pedido." },
        { status: 200 }
      )
    }

    const customerEmail = request.nextUrl.searchParams.get("to") || order.customer_email
    const customerName =
      [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ") ||
      undefined

    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "http"
    const baseUrl = host ? `${protocol}://${host}` : ""
    const emailHtml = generateInvoiceEmailHTML(order, customerName, baseUrl)

    const emailSent = await sendEmail({
      to: customerEmail,
      subject: `Confirmación de Pedido #${order.order_number}`,
      html: emailHtml,
    })

    return NextResponse.json({
      ok: emailSent.success,
      message: emailSent.success
        ? `Correo de confirmación enviado a ${customerEmail} (pedido #${order.order_number})`
        : emailSent.error,
      orderNumber: order.order_number,
      to: customerEmail,
    })
  } catch (err: any) {
    console.error("Error en test-confirmation-email:", err)
    return NextResponse.json(
      { ok: false, message: "Error interno", error: err?.message },
      { status: 500 }
    )
  }
}
