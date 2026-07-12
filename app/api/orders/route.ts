import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  createOrder,
  type CreateOrderData,
  type OrderWithItems,
} from "@/lib/supabase/orders-api";
import { getServiceEcommerceClient } from "@/lib/supabase/service-client";
import {
  generateInvoiceEmailHTML,
  sendEmail,
} from "@/lib/orders/order-confirmation-email";
import { resolveEmailBaseUrl } from "@/lib/security/email-runtime-guards";

const ALLOWED_PAYMENT_METHODS = new Set(["cash_on_delivery"]);
const DEFAULT_PAYMENT_METHOD = "cash_on_delivery";

function normalizePaymentMethod(paymentMethod: unknown): string {
  return typeof paymentMethod === "string" &&
    ALLOWED_PAYMENT_METHODS.has(paymentMethod)
    ? paymentMethod
    : DEFAULT_PAYMENT_METHOD;
}

async function resolveAuthenticatedUserId(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const bearer = request.headers.get("authorization");
  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_name: string, _value: string, _options: any) {},
      remove(_name: string, _options: any) {},
    },
    global: bearer ? { headers: { Authorization: bearer } } : undefined,
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user?.id) return null;

  return data.user.id;
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = getServiceEcommerceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: "Supabase service role no configurado" },
        { status: 500 },
      );
    }

    const input = (await request.json()) as CreateOrderData;
    const authenticatedUserId = await resolveAuthenticatedUserId(request);
    const safeOrderData: CreateOrderData = {
      ...input,
      customer_type: authenticatedUserId ? "user" : "guest",
      user_id: authenticatedUserId,
      payment_status: "pending",
      payment_method: normalizePaymentMethod(input.payment_method),
      payment_reference: undefined,
    };

    const order = await createOrder(safeOrderData, serviceClient);
    if (!order) {
      return NextResponse.json(
        { error: "No se pudo crear el pedido" },
        { status: 500 },
      );
    }

    await sendOrderConfirmationEmail(request, order);

    return NextResponse.json({ order });
  } catch (error: any) {
    const validationResult = error?.validationResult;
    const status = validationResult ? 409 : 500;

    return NextResponse.json(
      {
        error: error?.message || "Error inesperado al crear pedido",
        ...(validationResult ? { validationResult } : {}),
      },
      { status },
    );
  }
}

// Envío del correo de confirmación: best-effort, nunca debe hacer fallar el pedido ya creado.
async function sendOrderConfirmationEmail(
  request: NextRequest,
  order: OrderWithItems,
) {
  try {
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const requestOrigin = host ? `${protocol}://${host}` : "";
    const baseUrlForEmail = resolveEmailBaseUrl({
      requestOrigin,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      vercelUrl: process.env.VERCEL_URL,
    });

    const customerName =
      [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(" ") || undefined;
    const emailHtml = generateInvoiceEmailHTML(
      order,
      customerName,
      baseUrlForEmail,
    );

    const emailSent = await sendEmail({
      to: order.customer_email,
      subject: `Confirmación de Pedido #${order.order_number}`,
      html: emailHtml,
    });

    if (!emailSent.success) {
      console.error(
        "Error al enviar correo de confirmación:",
        emailSent.error,
      );
    }
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error);
  }
}
