import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES } from "@/lib/supabase/contract"

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
      .select("id, order_number, customer_email, customer_first_name, customer_last_name")
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

    const last = orders[0]
    const orderId = last.id
    const orderNumber = last.order_number
    const customerEmail = request.nextUrl.searchParams.get("to") || last.customer_email
    const customerName =
      last.customer_first_name && last.customer_last_name
        ? `${last.customer_first_name} ${last.customer_last_name}`
        : undefined

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      `http://${request.headers.get("host") || "localhost:3000"}`

    const res = await fetch(`${base}/api/orders/send-confirmation-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        orderNumber,
        customerEmail,
        customerName,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Error al enviar el correo",
          detail: data,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      ok: data.success,
      message: data.success
        ? `Correo de confirmación enviado a ${customerEmail} (pedido #${orderNumber})`
        : data.warning || data.message,
      orderNumber,
      to: customerEmail,
      error: data.error,
    })
  } catch (err: any) {
    console.error("Error en test-confirmation-email:", err)
    return NextResponse.json(
      { ok: false, message: "Error interno", error: err?.message },
      { status: 500 }
    )
  }
}
