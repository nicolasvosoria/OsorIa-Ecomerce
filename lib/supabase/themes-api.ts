import { getSupabaseEcommerce } from "./client";
import type { AppTheme } from "@/lib/types/theme";
import { requireAdmin } from "./permissions-api";
import { getStoreId, normalizeRuntimeStoreId } from "@/lib/utils/store";
import { normalizeThemeRecord } from "@/lib/theme-font/runtime-contract";

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

function normalizeThemeRow(theme: any): AppTheme | null {
  const normalized = normalizeThemeRecord(theme);
  if (!normalized) {
    return null;
  }

  return {
    ...theme,
    theme_name: normalized.theme_name,
    colors: normalized.colors,
  } as AppTheme;
}

export async function getThemes(): Promise<AppTheme[]> {
  console.log("[Theme] === INICIANDO getThemes ===");
  const supabase = getSupabaseEcommerce();
  if (!supabase) {
    console.error(
      "[Theme] ❌ Supabase no configurado - retornando array vacío",
    );
    return [];
  }
  console.log("[Theme] ✅ Cliente Supabase obtenido (schema ecommerce)");

  try {
    let storeId = normalizeRuntimeStoreId(await getStoreId());
    if (!storeId) {
      console.log(
        "[Theme] No hay store_id disponible, obteniendo tienda por defecto...",
      );
      const { data: defaultStore } = await supabase
        .from("stores_legacy")
        .select("id")
        .eq("subdomain", "default")
        .maybeSingle();
      if (defaultStore?.id) {
        storeId = defaultStore.id;
        console.log("[Theme] ✅ Usando tienda por defecto:", storeId);
      } else {
        console.warn(
          "[Theme] ⚠️ No se encontró tienda por defecto, consultando sin filtro store_id",
        );
      }
    }

    console.log(
      "[Theme] Ejecutando consulta a app_themes (schema ecommerce)...",
    );
    const startTime = Date.now();
    let queryPromise = supabase
      .from("app_themes")
      .select("*")
      .order("theme_name");
    if (storeId) {
      queryPromise = queryPromise.or(`store_id.eq.${storeId},store_id.is.null`);
    } else {
      queryPromise = queryPromise.is("store_id", null);
    }

    console.log("[Theme] Enviando consulta completa...");
    let result = (await withTimeout(queryPromise, 20000)) as {
      data: any;
      error: any;
    };
    let { data, error } = result;
    if (
      error &&
      (error?.message?.includes("store_id") || error?.code === "42703")
    ) {
      queryPromise = supabase
        .from("app_themes")
        .select("*")
        .order("theme_name");
      result = (await withTimeout(queryPromise, 20000)) as {
        data: any;
        error: any;
      };
      data = result.data;
      error = result.error;
    }
    const elapsedTime = Date.now() - startTime;
    console.log(
      "[Theme] Consulta completada en",
      elapsedTime,
      "ms. Error:",
      error ? "Sí" : "No",
    );

    if (error) {
      const errMsg =
        typeof error?.message === "string"
          ? error.message
          : JSON.stringify(error);
      const errCode = error?.code;
      console.error("[Theme] ❌ Error fetching themes:", {
        message: errMsg,
        code: errCode,
        details: error?.details,
        hint: error?.hint,
        storeId,
        rawError: error,
      });
      if (
        errCode === "PGRST301" ||
        (errMsg &&
          (errMsg.includes("permission") ||
            errMsg.includes("RLS") ||
            errMsg.includes("does not exist")))
      ) {
        console.error(
          "[Theme] ⚠️ Posible problema: tabla app_themes en schema ecommerce, RLS o permisos. Revisa que la tabla exista y RLS permita lectura.",
        );
      }
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(
        "[Theme] ⚠️ No se encontraron temas en la base de datos para store_id:",
        storeId,
      );
      return [];
    }

    console.log("[Theme] ✅ Temas cargados exitosamente:", data.length);
    const themes = data
      .map((theme: any) => normalizeThemeRow(theme))
      .filter((theme: AppTheme | null): theme is AppTheme => theme !== null);
    console.log("[Theme] === FINALIZANDO getThemes ===");
    return themes;
  } catch (err) {
    console.error("[Theme] ❌ Excepción al obtener temas:", err);
    if (err instanceof Error) {
      console.error("[Theme] Mensaje de error:", err.message);
      console.error("[Theme] Stack:", err.stack);
    }
    return [];
  }
}

export async function getActiveTheme(): Promise<AppTheme | null> {
  const supabase = getSupabaseEcommerce();
  if (!supabase) {
    return null;
  }

  let storeId = normalizeRuntimeStoreId(await getStoreId());
  if (!storeId) {
    const { data: defaultStore } = await supabase
      .from("stores_legacy")
      .select("id")
      .eq("subdomain", "default")
      .maybeSingle();
    if (defaultStore?.id) storeId = defaultStore.id;
  }

  // Nuevo esquema: tema activo por tienda en app_theme_versions
  if (storeId) {
    const { data: version } = await supabase
      .from("app_theme_versions")
      .select("theme_id")
      .eq("store_id", storeId)
      .eq("is_current", true)
      .maybeSingle();
    if (version?.theme_id) {
      const { data: theme, error: themeError } = await supabase
        .from("app_themes")
        .select("*")
        .eq("id", version.theme_id)
        .maybeSingle();
      if (!themeError && theme) {
        const normalizedTheme = normalizeThemeRow(theme);
        if (normalizedTheme) {
          return normalizedTheme;
        }
      }
    }
  }

  // Fallback: tema con is_active en app_themes (compatibilidad)
  let query = supabase.from("app_themes").select("*").eq("is_active", true);
  if (storeId) {
    query = query.or(`store_id.eq.${storeId},store_id.is.null`).limit(1);
  } else {
    query = query.is("store_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    let errorDetails: any;
    let errorHint: string | undefined;

    if (error && typeof error === "object") {
      try {
        errorCode = "code" in error ? String((error as any).code) : undefined;
        errorMessage =
          "message" in error ? String((error as any).message) : undefined;
        errorDetails = "details" in error ? (error as any).details : undefined;
        errorHint = "hint" in error ? String((error as any).hint) : undefined;
      } catch (e) {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }

    // Si el error es "no rows found", no es un error crítico
    if (
      errorCode === "PGRST116" ||
      errorMessage?.includes("No rows") ||
      errorMessage?.includes("not found") ||
      errorMessage?.includes("No rows returned") ||
      errorMessage?.includes("The result contains 0 rows")
    ) {
      console.log(
        `[Theme] No se encontró tema activo para store_id: ${storeId || "NULL"}`,
      );
      return null;
    }

    // Fallback: si falla por columna store_id u otro, intentar sin filtro store_id
    const fallbackRes = await supabase
      .from("app_themes")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!fallbackRes.error && fallbackRes.data) {
      const normalizedTheme = normalizeThemeRow(fallbackRes.data);
      if (normalizedTheme) {
        return normalizedTheme;
      }
    }

    const errMsg =
      errorMessage ??
      (typeof error?.message === "string"
        ? error.message
        : JSON.stringify(error));
    const errCode = errorCode ?? error?.code;

    const errorInfo: Record<string, any> = {
      storeId,
      message: errMsg,
      code: errCode,
      details: errorDetails ?? error?.details,
      hint: errorHint ?? error?.hint,
      rawError: error,
    };

    try {
      errorInfo.rawString = JSON.stringify(
        error,
        (key, value) => {
          if (typeof value === "object" && value !== null) return value;
          return value;
        },
        2,
      );
    } catch (_) {
      errorInfo.rawString = String(error);
    }

    console.error("[Theme] Error fetching active theme:", errorInfo);
    return null;
  }

  if (!data) return null;

  return normalizeThemeRow(data);
}

export async function setActiveTheme(
  themeName: string,
): Promise<{ success: boolean; error?: string }> {
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

  const supabase = getSupabaseEcommerce();
  if (!supabase) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    let storeId = normalizeRuntimeStoreId(await getStoreId());
    if (!storeId) {
      const { data: defaultStore } = await supabase
        .from("stores_legacy")
        .select("id")
        .eq("subdomain", "default")
        .maybeSingle();
      if (defaultStore?.id) storeId = defaultStore.id;
    }
    if (!storeId) {
      return { success: false, error: "No se pudo obtener la tienda" };
    }

    const { data: theme } = await supabase
      .from("app_themes")
      .select("id")
      .eq("theme_name", themeName)
      .single();
    if (!theme?.id) {
      return { success: false, error: "Tema no encontrado" };
    }

    await supabase
      .from("app_theme_versions")
      .update({ is_current: false })
      .eq("store_id", storeId);

    const { data: existing } = await supabase
      .from("app_theme_versions")
      .select("id")
      .eq("store_id", storeId)
      .eq("theme_id", theme.id)
      .maybeSingle();

    if (existing?.id) {
      const { error: activateError } = await supabase
        .from("app_theme_versions")
        .update({ is_current: true })
        .eq("id", existing.id);
      if (activateError) {
        console.error("[Theme] Error activating theme:", activateError);
        return { success: false, error: "Error al activar tema" };
      }
    } else {
      const { error: insertError } = await supabase
        .from("app_theme_versions")
        .insert({
          id: crypto.randomUUID(),
          store_id: storeId,
          theme_id: theme.id,
          is_current: true,
        });
      if (insertError) {
        console.error("[Theme] Error creating theme version:", insertError);
        return { success: false, error: "Error al activar tema" };
      }
    }

    return { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: errorMessage };
  }
}
