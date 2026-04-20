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
  getFonts,
  getActiveFont,
  setActiveFont,
} from "@/lib/supabase/fonts-api";
import type { AppFont } from "@/lib/types/font";
import { applyRuntimeFont } from "@/lib/theme-font/bootstrap";

interface FontContextType {
  fonts: AppFont[];
  activeFont: AppFont | null;
  loading: boolean;
  error: string | null;
  changeFont: (
    fontName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  refreshFonts: () => Promise<void>;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: ReactNode }) {
  const [fonts, setFonts] = useState<AppFont[]>([]);
  const [activeFont, setActiveFontState] = useState<AppFont | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appliedFontRef = useRef<string | null>(null); // Para evitar aplicar la misma fuente múltiples veces

  const refreshFonts = async () => {
    try {
      console.log("[Font] Iniciando carga de fuentes...");
      setLoading(true);
      setError(null);
      const [fontsData, activeFontData] = await Promise.all([
        getFonts(),
        getActiveFont(),
      ]);
      console.log(
        "[Font] Fuentes recibidas:",
        fontsData.length,
        "Fuente activa:",
        activeFontData ? "Sí" : "No",
      );
      setFonts(fontsData);
      setActiveFontState(activeFontData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar fuentes";
      setError(errorMessage);
      console.error("[Font] Error loading fonts:", err);
    } finally {
      setLoading(false);
    }
  };

  const changeFont = async (
    fontName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await setActiveFont(fontName);
      if (result.success) {
        // Aplicar fuente inmediatamente desde la lista actual (forzar aplicación)
        const selectedFont = fonts.find((f) => f.font_name === fontName);
        if (selectedFont) {
          applyFont(selectedFont, true); // Forzar aplicación
        }
        // Refrescar fuentes para actualizar el estado
        await refreshFonts();
      }
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cambiar fuente";
      return { success: false, error: errorMessage };
    }
  };

  const applyFont = (font: AppFont, force: boolean = false) => {
    if (typeof document === "undefined") return;

    // Evitar aplicar la misma fuente múltiples veces (a menos que sea forzado)
    if (!force && appliedFontRef.current === font.font_name) {
      return;
    }

    // Si el script ya aplicó esta fuente desde localStorage, no volver a aplicarla
    // a menos que sea un cambio explícito (force = true)
    if (
      !force &&
      typeof window !== "undefined" &&
      (window as any).__osoria_applied_font === font.font_name
    ) {
      appliedFontRef.current = font.font_name;
      return;
    }

    const normalizedFont = applyRuntimeFont(font);
    if (!normalizedFont) {
      return;
    }

    // Marcar que esta fuente ya fue aplicada
    appliedFontRef.current = font.font_name;

    // Guardar en localStorage para aplicar inmediatamente en la próxima carga
    try {
      localStorage.setItem(
        "osoria_active_font",
        JSON.stringify(normalizedFont),
      );
    } catch (e) {
      console.warn("[Font] Error saving font to localStorage:", e);
    }
  };
  useEffect(() => {
    // Solo cargar en el cliente, no durante SSR/prerendering
    if (typeof window !== "undefined") {
      console.log(
        "[Font] Provider montado, iniciando carga de fuentes (independiente de autenticación)...",
      );
      refreshFonts();
    } else {
      // Durante SSR, usar valores por defecto
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Esperar a que termine la carga antes de aplicar
    if (loading) return;

    // Verificar si el script ya aplicó una fuente desde localStorage
    const scriptAppliedFont =
      typeof window !== "undefined"
        ? (window as any).__osoria_applied_font
        : null;

    // Solo aplicar si tenemos una fuente activa y no se ha aplicado ya
    if (activeFont) {
      // Si el script ya aplicó esta fuente, solo marcar como aplicada sin volver a aplicar
      if (scriptAppliedFont === activeFont.font_name) {
        appliedFontRef.current = activeFont.font_name;
        return;
      }

      // Solo aplicar si no se ha aplicado ya
      if (appliedFontRef.current !== activeFont.font_name) {
        applyFont(activeFont);
      }
    }
  }, [activeFont, loading]); // Agregar loading para evitar aplicar antes de que termine la carga

  const value: FontContextType = {
    fonts,
    activeFont,
    loading,
    error,
    changeFont,
    refreshFonts,
  };

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error("useFont must be used within a FontProvider");
  }
  return context;
}
