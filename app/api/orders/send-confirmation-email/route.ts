import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrderById } from "@/lib/supabase/orders-api";
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import { generateInvoiceEmailHTML } from "@/lib/orders/order-confirmation-email";
import { getErrorMessage } from "@/lib/security/email-runtime-guards";

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
    return NextResponse.json(
      { error: "Solo disponible en desarrollo" },
      { status: 404 },
    );
  }
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return new NextResponse(
        "<html><body><p>Variables de Supabase no configuradas.</p></body></html>",
        {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey).schema(
      ECOMMERCE_SCHEMA,
    );
    const { data: orders, error } = await supabase
      .from(ECOMMERCE_TABLES.orders)
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !orders?.length) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; padding: 2rem;"><h1>Vista previa del correo</h1><p>No hay pedidos en la base de datos. Haz un pedido de prueba y vuelve a abrir esta URL para ver el HTML del correo.</p><p><a href="/">Ir al inicio</a></p></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    const order = await getOrderById(orders[0].id);
    if (!order) {
      return new NextResponse(
        "<html><body><p>No se pudo cargar el pedido.</p></body></html>",
        {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }
    const customerName =
      [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(" ") || undefined;
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const origin = host ? `${protocol}://${host}` : "";
    const html = generateInvoiceEmailHTML(order, customerName, origin);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error("Error en vista previa del correo:", error);
    return new NextResponse(
      `<html><body><p>Error: ${errorMessage}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}
