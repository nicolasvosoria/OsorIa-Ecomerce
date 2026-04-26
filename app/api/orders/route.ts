import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { ECOMMERCE_SCHEMA } from "@/lib/supabase/contract";
import { createOrder, type CreateOrderData } from "@/lib/supabase/orders-api";

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

function getServiceEcommerceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).schema(ECOMMERCE_SCHEMA);
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
    };

    const order = await createOrder(safeOrderData, serviceClient);
    if (!order) {
      return NextResponse.json(
        { error: "No se pudo crear el pedido" },
        { status: 500 },
      );
    }

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
