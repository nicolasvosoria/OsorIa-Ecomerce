import { getSupabaseEcommerce } from "./client";
import type { AppFont } from "@/lib/types/font";
import { requireAdmin } from "./permissions-api";
import { getAdminRequestHeaders } from "./admin-request-headers";
import { normalizeFontRecord } from "@/lib/theme-font/runtime-contract";

// Helper para agregar timeout a las promesas
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout después de ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

function normalizeFontRow(font: any): AppFont | null {
  const normalized = normalizeFontRecord(font);
  if (!normalized) {
    return null;
  }

  return {
    ...font,
    font_name: normalized.font_name,
    font_family: normalized.font_family,
    google_font_url: normalized.google_font_url,
  } as AppFont;
}

export async function getFonts(): Promise<AppFont[]> {
  console.log("[Font] === INICIANDO getFonts ===");
  const supabase = getSupabaseEcommerce();
  if (!supabase) {
    console.error("[Font] ❌ Supabase no configurado - retornando array vacío");
    return [];
  }
  console.log("[Font] ✅ Cliente Supabase obtenido");

  try {
    // Las peticiones de fuentes son independientes de la autenticación
    // No verificamos sesión para evitar bloqueos
    console.log(
      "[Font] Ejecutando consulta a app_fonts (sin verificar sesión)...",
    );
    console.log(
      "[Font] URL de Supabase:",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    const startTime = Date.now();

    // Test de conectividad opcional (solo en desarrollo y no bloquea el flujo)
    if (process.env.NODE_ENV === "development") {
      try {
        console.log("[Font] Probando conectividad con Supabase...");
        const testQuery = supabase
          .from("app_fonts_legacy")
          .select("id")
          .limit(1);
        const testResult = await Promise.race([
          testQuery,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Test timeout")), 3000),
          ),
        ]).catch(() => null); // No propagar el error del test

        if (testResult) {
          console.log("[Font] Test de conectividad: ✅ OK");
        } else {
          console.warn(
            "[Font] ⚠️ Test de conectividad falló o timeout (continuando de todas formas)",
          );
        }
      } catch (testError) {
        // Ignorar errores del test, no afectan la funcionalidad principal
        console.warn(
          "[Font] ⚠️ Test de conectividad no pudo completarse (continuando):",
          testError instanceof Error ? testError.message : testError,
        );
      }
    }

    const queryPromise = supabase
      .from("app_fonts_legacy")
      .select("*")
      .order("font_name");

    console.log("[Font] Enviando consulta completa...");
    const result = (await withTimeout(queryPromise, 20000)) as {
      data: any;
      error: any;
    };
    const { data, error } = result;
    const elapsedTime = Date.now() - startTime;
    console.log(
      "[Font] Consulta completada en",
      elapsedTime,
      "ms. Error:",
      error ? "Sí" : "No",
    );

    if (error) {
      console.error("[Font] ❌ Error fetching fonts:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2),
      });

      // Si el error es de permisos o RLS, dar más información
      if (
        error.code === "PGRST301" ||
        error.message?.includes("permission") ||
        error.message?.includes("RLS")
      ) {
        console.error(
          "[Font] ⚠️ Posible problema de RLS o permisos. Verifica que RLS esté deshabilitado o que las políticas permitan lectura pública.",
        );
      }

      return [];
    }

    if (!data || data.length === 0) {
      console.warn("[Font] ⚠️ No se encontraron fuentes en la base de datos");
      return [];
    }

    console.log("[Font] ✅ Fuentes cargadas exitosamente:", data.length);
    console.log("[Font] === FINALIZANDO getFonts ===");
    return data
      .map((font: any) => normalizeFontRow(font))
      .filter((font: AppFont | null): font is AppFont => font !== null);
  } catch (err) {
    console.error("[Font] ❌ Excepción al obtener fuentes:", err);
    if (err instanceof Error) {
      console.error("[Font] Mensaje de error:", err.message);
      console.error("[Font] Stack:", err.stack);
    }
    return [];
  }
}

export async function getActiveFont(): Promise<AppFont | null> {
  const supabase = getSupabaseEcommerce();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_fonts_legacy")
    .select("*")
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("[Font] Error fetching active font:", error);
    return null;
  }

  if (!data) return null;

  return normalizeFontRow(data);
}

export async function setActiveFont(
  fontName: string,
): Promise<{ success: boolean; error?: string }> {
  // Verificar que el usuario es administrador
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Se requieren permisos de administrador",
    };
  }

  try {
    const response = await fetch("/api/admin/font-activation", {
      method: "POST",
      headers: await getAdminRequestHeaders(),
      body: JSON.stringify({
        fontName,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "Error al activar fuente";

      return { success: false, error: message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: errorMessage };
  }
}
