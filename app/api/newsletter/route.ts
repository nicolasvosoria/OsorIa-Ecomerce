import { NextRequest, NextResponse } from "next/server";

import { subscribeEmail } from "@/lib/supabase/newsletter-api";
import { getServiceEcommerceClient } from "@/lib/supabase/service-client";
import { isValidEmail } from "@/lib/utils/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const serviceClient = getServiceEcommerceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: "Supabase service role no configurado" },
        { status: 500 },
      );
    }

    await subscribeEmail(email, serviceClient);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[Newsletter] Error inesperado al suscribir email:", error);
    return NextResponse.json(
      { error: "Error inesperado al suscribir el email" },
      { status: 500 },
    );
  }
}
