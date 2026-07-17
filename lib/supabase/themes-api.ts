import { getSupabaseEcommerce } from "./client";
import { ECOMMERCE_TABLES, ECOMMERCE_VIEWS } from "./contract";
import type {
  AppTheme,
  ThemeDefinition,
  ThemeVersionSummary,
} from "@/lib/types/theme";
import { requireAdmin } from "./permissions-api";
import { getAdminRequestHeaders } from "./admin-request-headers";
import { getStoreId, normalizeRuntimeStoreId } from "@/lib/utils/store";
import { normalizeThemeRecord } from "@/lib/theme-font/runtime-contract";

/**
 * The preset `getActiveTheme` resolves to for a store with no publication of
 * its own (no `is_current=true` row in `app_theme_versions`) — anchored by
 * name in code (D7), not by `app_themes.is_active`. `is_active` is a flag on
 * the shared preset catalog (no `store_id`); letting it decide any one
 * store's theme is a cross-tenant leak (touching it for one store silently
 * changes what every unpublished store renders). "Tech" is the preset that
 * already resolves de facto today (the only row with `is_active=true`), so
 * anchoring to it here is behavior-invisible.
 */
export const CATALOG_DEFAULT_THEME_NAME = "Tech";

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

/**
 * Defensively lifts `app_theme_versions.variables`/`.fonts` jsonb into the
 * raw-record keys `normalizeThemeRecord` already knows how to merge
 * (`colorsLight`, `colorsDark`, `radius`, `density`, `shadow`, `shape`,
 * `sections`, `fontPairingId`). Each field is re-validated independently inside
 * `normalizeThemeRecord`, so a partially malformed bundle only drops the bad
 * field(s) instead of failing the whole merge. A non-object bundle (or NULL,
 * the real state for every store today) yields an empty overlay, so the
 * caller falls straight through to the `resolveThemeDefinition` fallback —
 * i.e. no behavior change.
 */
function extractStoredDefinitionOverlay(
  variables: unknown,
  fonts: unknown,
): Record<string, unknown> {
  const variablesRecord = toPlainRecord(variables) ?? {};
  const fontsRecord = toPlainRecord(fonts) ?? {};
  const overlay: Record<string, unknown> = {};

  if ("colorsLight" in variablesRecord) {
    overlay.colorsLight = variablesRecord.colorsLight;
  }
  if ("colorsDark" in variablesRecord) {
    overlay.colorsDark = variablesRecord.colorsDark;
  }
  if ("radius" in variablesRecord) {
    overlay.radius = variablesRecord.radius;
  }
  if ("density" in variablesRecord) {
    overlay.density = variablesRecord.density;
  }
  if ("shadow" in variablesRecord) {
    overlay.shadow = variablesRecord.shadow;
  }
  if ("shape" in variablesRecord) {
    overlay.shape = variablesRecord.shape;
  }
  if ("sections" in variablesRecord) {
    overlay.sections = variablesRecord.sections;
  }
  if ("fontPairingId" in fontsRecord) {
    overlay.fontPairingId = fontsRecord.fontPairingId;
  }

  return overlay;
}

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

function normalizeThemeRow(
  theme: any,
  publication: Record<string, unknown> = {},
): AppTheme | null {
  const normalized = normalizeThemeRecord({ ...theme, ...publication });
  if (!normalized) {
    return null;
  }

  // `normalizeThemeRecord` always populates these (falling back to
  // `resolveThemeDefinition` when no stored bundle overrides them), so
  // `definition` is always present here. The guard just keeps this callsite
  // defensive against a future change to that guarantee.
  const definition: ThemeDefinition | undefined =
    normalized.colorsLight &&
    normalized.colorsDark &&
    normalized.radius &&
    normalized.density &&
    normalized.shadow &&
    normalized.shape
      ? {
          colorsLight: normalized.colorsLight,
          colorsDark: normalized.colorsDark,
          radius: normalized.radius,
          density: normalized.density,
          shadow: normalized.shadow,
          shape: normalized.shape,
          fontPairingId: normalized.fontPairingId ?? null,
          sections: normalized.sections,
        }
      : undefined;

  return {
    ...theme,
    theme_name: normalized.theme_name,
    colors: normalized.colors,
    theme_fingerprint: normalized.theme_fingerprint,
    theme_version_id: normalized.theme_version_id,
    theme_published_at: normalized.theme_published_at,
    store_id: normalized.store_id,
    definition,
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
    console.log(
      "[Theme] Ejecutando consulta a app_themes (schema ecommerce)...",
    );
    const startTime = Date.now();
    const queryPromise = supabase
      .from(ECOMMERCE_TABLES.appThemes)
      .select("*")
      .order("theme_name");

    console.log("[Theme] Enviando consulta completa...");
    const result = (await withTimeout(queryPromise, 20000)) as {
      data: any;
      error: any;
    };
    const { data, error } = result;
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
      console.warn("[Theme] ⚠️ No se encontraron temas en la base de datos");
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

// `storeIdOverride` lets the theme editor read the ACTIVE store's publication
// (D10) rather than the host's, so the base it seeds matches the store its
// writes target (#2345). The storefront omits it and stays host-scoped.
export async function getActiveTheme(storeIdOverride?: string): Promise<AppTheme | null> {
  const supabase = getSupabaseEcommerce();
  if (!supabase) {
    return null;
  }

  let storeId =
    normalizeRuntimeStoreId(storeIdOverride) ?? normalizeRuntimeStoreId(await getStoreId());
  if (!storeId) {
    const { data: defaultStore } = await supabase
      .from(ECOMMERCE_VIEWS.storesLegacy)
      .select("id")
      .eq("subdomain", "default")
      .maybeSingle();
    if (defaultStore?.id) storeId = defaultStore.id;
  }

  // Nuevo esquema: tema activo por tienda en app_theme_versions
  if (storeId) {
    const { data: version } = await supabase
      .from(ECOMMERCE_TABLES.appThemeVersions)
      .select("id, store_id, theme_id, created_at, variables, fonts")
      .eq("store_id", storeId)
      .eq("is_current", true)
      .maybeSingle();
    if (version?.theme_id) {
      const { data: theme, error: themeError } = await supabase
        .from(ECOMMERCE_TABLES.appThemes)
        .select("*")
        .eq("id", version.theme_id)
        .maybeSingle();
      if (!themeError && theme) {
        const storedDefinitionOverlay = extractStoredDefinitionOverlay(
          version.variables,
          version.fonts,
        );
        const normalizedTheme = normalizeThemeRow(theme, {
          store_id: version.store_id ?? storeId,
          theme_version_id: version.id,
          theme_published_at: version.created_at,
          ...storedDefinitionOverlay,
        });
        if (normalizedTheme) {
          return normalizedTheme;
        }
      }
    }
  }

  // Fallback: la tienda no tiene publicación propia. Ancla al preset "Tech"
  // del catálogo por nombre (D7) — nunca por `is_active`, que es un flag
  // global compartido por todas las tiendas.
  const { data, error } = await supabase
    .from(ECOMMERCE_TABLES.appThemes)
    .select("*")
    .eq("theme_name", CATALOG_DEFAULT_THEME_NAME)
    .limit(1)
    .maybeSingle();

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
      } catch {
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
    } catch {
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
): Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }> {
  return postThemeActivation({ themeName }, "Error al activar tema");
}

async function postThemeActivation(
  body: Record<string, unknown>,
  fallbackError: string,
): Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }> {
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
    const response = await fetch("/api/admin/theme-activation", {
      method: "POST",
      headers: await getAdminRequestHeaders(),
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : fallbackError;

      return { success: false, error: message };
    }

    const activeTheme =
      payload && typeof payload === "object" && "activeTheme" in payload
        ? (payload.activeTheme as AppTheme)
        : undefined;

    return activeTheme ? { success: true, activeTheme } : { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: errorMessage };
  }
}

/**
 * Publishes an arbitrary edited `ThemeDefinition` as a new custom version for
 * the store (the customizer "Aplicar" path). Anchors to the base preset by
 * name; the route stores the full definition (colors, shape, sections) in the
 * new `app_theme_versions` row and flips `is_current`.
 */
export async function setActiveThemeCustom(
  baseThemeName: string,
  definition: ThemeDefinition,
): Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }> {
  return postThemeActivation(
    { baseThemeName, definition },
    "Error al aplicar el tema personalizado",
  );
}

/**
 * Fetches this store's theme version history (newest first) for the
 * customizer's history panel. Admin-gated server-side; returns an empty list
 * on any failure so the panel can render an empty state instead of throwing.
 */
export async function getThemeVersions(): Promise<ThemeVersionSummary[]> {
  try {
    await requireAdmin();
  } catch (error) {
    console.error("[Theme Versions] Acceso no autorizado:", error);
    return [];
  }

  try {
    const response = await fetch("/api/admin/theme-versions", {
      method: "GET",
      headers: await getAdminRequestHeaders(),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !Array.isArray(payload.versions)) {
      return [];
    }

    return payload.versions as ThemeVersionSummary[];
  } catch (err) {
    console.error("[Theme Versions] Error al obtener el historial:", err);
    return [];
  }
}

/**
 * Reactivates a version already in history (the customizer's "Restaurar"
 * action). Never inserts a new version row; the route only flips
 * `is_current` onto the chosen one (D3, Option A).
 */
export async function revertToThemeVersion(
  versionId: string,
): Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }> {
  return postThemeActivation(
    { versionId },
    "No se pudo restaurar la versión del tema",
  );
}
