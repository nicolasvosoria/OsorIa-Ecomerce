"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  getThemes,
  getActiveTheme,
  setActiveTheme,
  setActiveThemeCustom,
  revertToThemeVersion,
  CATALOG_DEFAULT_THEME_NAME,
} from "@/lib/supabase/themes-api";
import { useAuth } from "@/contexts/auth-context";
import { useStyles } from "@/contexts/styles-context";
import type { AppTheme, ThemeDefinition } from "@/lib/types/theme";
import { applyRuntimeTheme } from "@/lib/theme-font/bootstrap";
import { normalizeThemeRecord } from "@/lib/theme-font/runtime-contract";
import {
  isThemePreviewMode,
  parseThemePreviewMessage,
} from "@/lib/theme-font/preview-mode";
import { deferStateUpdate } from "@/lib/react/defer-state-update";
import {
  getRuntimeStoreIdSync,
  resolveScopedStorageKey,
} from "@/lib/utils/store";

interface ThemeContextType {
  themes: AppTheme[];
  activeTheme: AppTheme | null;
  loading: boolean;
  error: string | null;
  changeTheme: (
    themeName: string,
  ) => Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }>;
  changeThemeCustom: (
    baseThemeName: string,
    definition: ThemeDefinition,
  ) => Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }>;
  revertToVersion: (
    versionId: string,
  ) => Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }>;
  refreshThemes: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<AppTheme[]>([]);
  const [activeTheme, setActiveThemeState] = useState<AppTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { refreshStyles } = useStyles();
  const appliedThemeRef = useRef<string | null>(null); // Para evitar aplicar el mismo tema múltiples veces

  const refreshThemes = async () => {
    try {
      console.log("[Theme] Iniciando carga de temas...");
      setLoading(true);
      setError(null);
      const [themesData, activeThemeData] = await Promise.all([
        getThemes(),
        getActiveTheme(),
      ]);
      console.log(
        "[Theme] Temas recibidos:",
        themesData.length,
        "Tema activo:",
        activeThemeData ? "Sí" : "No",
      );
      setThemes(themesData);

      // Usar el tema activo de BD para TODOS los usuarios (autenticados o no)
      // `getActiveTheme` ya resuelve al ancla del catálogo (D7) cuando la
      // tienda no tiene publicación propia; este `find` es solo un respaldo
      // extra por si esa llamada devolvió null (p.ej. Supabase no configurado).
      const defaultTheme = themesData.find(
        (t) => t.theme_name === CATALOG_DEFAULT_THEME_NAME,
      );
      let themeToUse = activeThemeData || defaultTheme;

      if (activeThemeData) {
        console.log(
          "[Theme] Usando tema activo desde BD:",
          activeThemeData.theme_name,
          "(todos los usuarios verán este tema)",
        );
      } else if (defaultTheme) {
        console.log(
          `[Theme] No hay tema activo en BD, usando '${CATALOG_DEFAULT_THEME_NAME}' por defecto`,
        );
        themeToUse = defaultTheme;
      }

      setActiveThemeState(themeToUse || null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar temas";
      setError(errorMessage);
      console.error("[Theme] Error loading themes:", err);

      // En caso de error, intentar aplicar el ancla del catálogo (D7) si hay
      // temas cargados
      if (themes.length > 0 && !isAuthenticated) {
        const defaultTheme = themes.find(
          (t) => t.theme_name === CATALOG_DEFAULT_THEME_NAME,
        );
        if (defaultTheme) {
          setActiveThemeState(defaultTheme);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Shared post-activation handling for both preset and custom applies: apply
  // + cache the confirmed theme, refresh the list, and drop/refetch the
  // per-section styles the server reset (D3).
  const finalizeThemeActivation = async (
    result: { success: boolean; error?: string; activeTheme?: AppTheme },
    fallbackThemeName?: string,
  ) => {
    if (!result.success) return;

    const confirmedTheme = result.activeTheme;
    const selectedTheme =
      confirmedTheme ??
      (fallbackThemeName
        ? themes.find((t) => t.theme_name === fallbackThemeName)
        : undefined);
    if (selectedTheme) {
      applyTheme(selectedTheme, true);
      setActiveThemeState(selectedTheme);
    }
    await refreshThemes();

    if (typeof window !== "undefined") {
      try {
        const storageKey = resolveScopedStorageKey(
          "osoria_component_styles",
          getRuntimeStoreIdSync(),
        );
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        console.warn("[Theme] Error clearing component styles cache:", e);
      }
      await refreshStyles();
    }
  };

  const changeTheme = async (
    themeName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await setActiveTheme(themeName);
      await finalizeThemeActivation(result, themeName);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cambiar tema";
      return { success: false, error: errorMessage };
    }
  };

  const changeThemeCustom = async (
    baseThemeName: string,
    definition: ThemeDefinition,
  ): Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }> => {
    try {
      const result = await setActiveThemeCustom(baseThemeName, definition);
      await finalizeThemeActivation(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al aplicar el tema";
      return { success: false, error: errorMessage };
    }
  };

  const revertToVersion = async (
    versionId: string,
  ): Promise<{ success: boolean; error?: string; activeTheme?: AppTheme }> => {
    // Same admin gating as the customizer page/route; no extra client guard
    // needed here (mirrors changeThemeCustom above).
    try {
      const result = await revertToThemeVersion(versionId);
      await finalizeThemeActivation(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al restaurar el tema";
      return { success: false, error: errorMessage };
    }
  };

  const applyTheme = (theme: AppTheme, force: boolean = false) => {
    if (typeof document === "undefined") return;

    const normalizedTheme = normalizeThemeRecord(theme);
    if (!normalizedTheme) {
      return;
    }

    const themeIdentity = normalizedTheme.theme_fingerprint;

    // Evitar aplicar el mismo tema múltiples veces (a menos que sea forzado)
    if (!force && appliedThemeRef.current === themeIdentity) {
      return;
    }

    // Si el script ya aplicó este fingerprint desde localStorage, no volver a aplicarlo
    // a menos que sea un cambio explícito (force = true)
    const scriptAppliedTheme =
      typeof window !== "undefined"
        ? (window as any).__osoria_applied_theme
        : null;
    const scriptAppliedFingerprint =
      typeof scriptAppliedTheme === "object" && scriptAppliedTheme !== null
        ? scriptAppliedTheme.theme_fingerprint
        : null;
    if (!force && scriptAppliedFingerprint === themeIdentity) {
      appliedThemeRef.current = themeIdentity;
      return;
    }

    applyRuntimeTheme(normalizedTheme);

    // Marcar que este tema ya fue aplicado
    appliedThemeRef.current = themeIdentity;

    // Guardar en localStorage para aplicar inmediatamente en la próxima carga
    try {
      localStorage.setItem(
        "osoria_active_theme",
        JSON.stringify(normalizedTheme),
      );
    } catch (e) {
      console.warn("[Theme] Error saving theme to localStorage:", e);
    }
  };

  useEffect(() => {
    // Solo cargar en el cliente, no durante SSR/prerendering
    if (typeof window === "undefined") {
      // Durante SSR, usar valores por defecto
      deferStateUpdate(() => setLoading(false));
      return;
    }

    // Modo de vista previa del customizer (/admin/theme): el padre controla
    // el tema vía postMessage, así que nunca se debe cargar ni aplicar el
    // tema persistido en BD (ver el listener de mensajes más abajo).
    if (isThemePreviewMode()) {
      deferStateUpdate(() => setLoading(false));
      return;
    }

    console.log("[Theme] Provider montado, iniciando carga de temas...");
    deferStateUpdate(() => {
      void refreshThemes();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refrescar temas periódicamente para detectar cambios del admin
  // Esto permite que todos los usuarios vean el tema activo actualizado
  useEffect(() => {
    if (isThemePreviewMode()) return;
    if (!loading && themes.length > 0) {
      // Refrescar cada 30 segundos para detectar cambios de tema del admin
      const interval = setInterval(() => {
        refreshThemes();
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, themes.length]);

  // Modo de vista previa del customizer: el tema activo lo empuja el padre
  // (app/admin/theme) por postMessage en lugar del ciclo normal de BD/poll.
  useEffect(() => {
    if (!isThemePreviewMode()) return;

    const handlePreviewMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const message = parseThemePreviewMessage(event.data);
      if (!message) return;

      applyRuntimeTheme(message.theme, message.mode);
    };

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, []);

  // Aplicar tema solo cuando se determine el tema activo final
  useEffect(() => {
    // En modo de vista previa, el listener de mensajes de arriba es la única
    // fuente de verdad: nunca se aplica un tema persistido.
    if (isThemePreviewMode()) return;

    // Esperar a que termine la carga antes de aplicar
    if (loading) return;

    // Verificar si el script ya aplicó un tema desde localStorage
    const scriptAppliedTheme =
      typeof window !== "undefined"
        ? (window as any).__osoria_applied_theme
        : null;

    // Solo aplicar si tenemos un tema activo y no se ha aplicado ya
    if (activeTheme) {
      const normalizedActiveTheme = normalizeThemeRecord(activeTheme);
      const activeIdentity = normalizedActiveTheme?.theme_fingerprint ?? null;
      const scriptAppliedFingerprint =
        typeof scriptAppliedTheme === "object" && scriptAppliedTheme !== null
          ? scriptAppliedTheme.theme_fingerprint
          : null;

      // Si el script ya aplicó este fingerprint, solo marcar como aplicado sin volver a aplicar
      if (activeIdentity && scriptAppliedFingerprint === activeIdentity) {
        appliedThemeRef.current = activeIdentity;
        return;
      }

      // Solo aplicar si no se ha aplicado ya
      if (activeIdentity && appliedThemeRef.current !== activeIdentity) {
        applyTheme(activeTheme);
      }
    } else if (!activeTheme && themes.length > 0) {
      // Si no hay tema activo, aplicar el ancla del catálogo (D7)
      // Esto aplica para TODOS los usuarios (autenticados o no)
      const defaultTheme = themes.find(
        (t) => t.theme_name === CATALOG_DEFAULT_THEME_NAME,
      );
      if (defaultTheme) {
        const normalizedDefaultTheme = normalizeThemeRecord(defaultTheme);
        const defaultIdentity =
          normalizedDefaultTheme?.theme_fingerprint ?? null;
        const scriptAppliedFingerprint =
          typeof scriptAppliedTheme === "object" && scriptAppliedTheme !== null
            ? scriptAppliedTheme.theme_fingerprint
            : null;

        // Si el script ya aplicó este fingerprint, solo marcar como aplicado
        if (defaultIdentity && scriptAppliedFingerprint === defaultIdentity) {
          appliedThemeRef.current = defaultIdentity;
          deferStateUpdate(() => setActiveThemeState(defaultTheme));
          return;
        }

        // Solo aplicar si no se ha aplicado ya
        if (defaultIdentity && appliedThemeRef.current !== defaultIdentity) {
          applyTheme(defaultTheme);
          setActiveThemeState(defaultTheme);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTheme, loading]); // Removido themes e isAuthenticated para evitar aplicaciones múltiples

  const value: ThemeContextType = {
    themes,
    activeTheme,
    loading,
    error,
    changeTheme,
    changeThemeCustom,
    revertToVersion,
    refreshThemes,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
