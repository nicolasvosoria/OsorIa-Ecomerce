import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {}
      },
    },
  });
}

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema("ecommerce") as any;
}

async function requireAdminUser(serviceSupabase: any) {
  const authSupabase = await getSupabaseAuthClient();
  if (!authSupabase) {
    return { error: "Supabase no configurado", status: 500 as const };
  }

  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  if (authError || !user) {
    return { error: "Acceso denegado", status: 401 as const };
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "Acceso denegado", status: 403 as const };
  }

  return { userId: user.id };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fontName =
      typeof body?.fontName === "string" ? body.fontName.trim() : "";

    if (!fontName) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 },
      );
    }

    const adminCheck = await requireAdminUser(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status },
      );
    }

    const { data: targetFont, error: targetFontError } = await supabase
      .from("app_fonts")
      .select("id")
      .eq("font_name", fontName)
      .maybeSingle();

    if (targetFontError) {
      throw targetFontError;
    }

    if (!targetFont?.id) {
      return NextResponse.json(
        { error: "Fuente no encontrada" },
        { status: 404 },
      );
    }

    const { error: deactivateError } = await supabase
      .from("app_fonts")
      .update({ is_active: false })
      .neq("is_active", false);

    if (deactivateError) {
      throw deactivateError;
    }

    const { error: activateError } = await supabase
      .from("app_fonts")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("font_name", fontName);

    if (activateError) {
      throw activateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Font Activation API] Error:", error);
    return NextResponse.json(
      { error: "Error al activar fuente" },
      { status: 500 },
    );
  }
}
