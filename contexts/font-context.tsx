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
  getPairings,
  getActivePairing,
  setActivePairing,
} from "@/lib/supabase/fonts-api";
import type { AppFont, AppFontPairing } from "@/lib/types/font";
import {
  applyRuntimeFont,
  applyRuntimePairing,
} from "@/lib/theme-font/bootstrap";
import {
  isThemePreviewMode,
  parseThemePreviewFontMessage,
} from "@/lib/theme-font/preview-mode";
import { deferStateUpdate } from "@/lib/react/defer-state-update";

interface FontContextType {
  fonts: AppFont[];
  activeFont: AppFont | null;
  pairings: AppFontPairing[];
  activePairing: AppFontPairing | null;
  loading: boolean;
  error: string | null;
  changePairing: (
    pairingName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  refreshFonts: () => Promise<void>;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: ReactNode }) {
  const [fonts, setFonts] = useState<AppFont[]>([]);
  const [activeFont, setActiveFontState] = useState<AppFont | null>(null);
  const [pairings, setPairings] = useState<AppFontPairing[]>([]);
  const [activePairing, setActivePairingState] =
    useState<AppFontPairing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appliedFontRef = useRef<string | null>(null); // Para evitar aplicar la misma fuente múltiples veces
  const appliedPairingRef = useRef<string | null>(null); // Para evitar aplicar la misma combinación múltiples veces

  const refreshFonts = async () => {
    try {
      console.log("[Font] Iniciando carga de fuentes...");
      setLoading(true);
      setError(null);
      const [fontsData, activeFontData, pairingsData, activePairingData] =
        await Promise.all([
          getFonts(),
          getActiveFont(),
          getPairings(),
          getActivePairing(),
        ]);
      console.log(
        "[Font] Fuentes recibidas:",
        fontsData.length,
        "Fuente activa:",
        activeFontData ? "Sí" : "No",
      );
      setFonts(fontsData);
      setActiveFontState(activeFontData);
      setPairings(pairingsData);
      setActivePairingState(activePairingData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar fuentes";
      setError(errorMessage);
      console.error("[Font] Error loading fonts:", err);
    } finally {
      setLoading(false);
    }
  };

  const changePairing = async (
    pairingName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await setActivePairing(pairingName);
      if (result.success) {
        const selectedPairing = pairings.find(
          (p) => p.pairing_name === pairingName,
        );
        if (selectedPairing) {
          applyPairing(selectedPairing, true);
        }
        await refreshFonts();
      }
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al cambiar combinación de fuentes";
      return { success: false, error: errorMessage };
    }
  };

  const applyPairing = (pairing: AppFontPairing, force: boolean = false) => {
    if (typeof document === "undefined") return;

    if (!force && appliedPairingRef.current === pairing.pairing_name) {
      return;
    }

    // Si el script ya aplicó esta combinación desde localStorage, no volver a aplicarla
    // a menos que sea un cambio explícito (force = true)
    if (
      !force &&
      typeof window !== "undefined" &&
      (window as any).__osoria_applied_pairing === pairing.pairing_name
    ) {
      appliedPairingRef.current = pairing.pairing_name;
      return;
    }

    const normalizedPairing = applyRuntimePairing(pairing);
    if (!normalizedPairing) {
      return;
    }

    appliedPairingRef.current = normalizedPairing.pairing_name;

    // Guardar en localStorage para aplicar inmediatamente en la próxima carga.
    // El font_axis se anida dentro de heading/body (formato que normalizePairingRecord
    // puede volver a leer) y también se expone en headingFontAxis/bodyFontAxis
    // (leído por el script beforeInteractive de apply-styles-script.tsx).
    try {
      localStorage.setItem(
        "osoria_active_pairing",
        JSON.stringify({
          pairing_name: normalizedPairing.pairing_name,
          heading: {
            ...normalizedPairing.heading,
            font_axis: normalizedPairing.headingFontAxis,
          },
          body: {
            ...normalizedPairing.body,
            font_axis: normalizedPairing.bodyFontAxis,
          },
          headingFontAxis: normalizedPairing.headingFontAxis,
          bodyFontAxis: normalizedPairing.bodyFontAxis,
        }),
      );
    } catch (e) {
      console.warn("[Font] Error saving pairing to localStorage:", e);
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
    // En modo preview del customizer, el padre (postMessage) es la única
    // fuente de la tipografía: no cargamos ni aplicamos el pairing persistido.
    if (typeof window !== "undefined" && isThemePreviewMode()) {
      deferStateUpdate(() => setLoading(false));
      return;
    }

    // Solo cargar en el cliente, no durante SSR/prerendering
    if (typeof window !== "undefined") {
      console.log(
        "[Font] Provider montado, iniciando carga de fuentes (independiente de autenticación)...",
      );
      deferStateUpdate(() => {
        void refreshFonts();
      });
    } else {
      // Durante SSR, usar valores por defecto
      deferStateUpdate(() => setLoading(false));
    }
  }, []);

  // Preview mode: apply the ephemeral pairing pushed by the customizer parent.
  // Applies directly via `applyRuntimePairing` (never the localStorage-writing
  // `applyPairing`), so the preview is fully ephemeral. Guarded so normal loads
  // never register this listener.
  useEffect(() => {
    if (!isThemePreviewMode()) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = parseThemePreviewFontMessage(event.data);
      if (!message) return;
      applyRuntimePairing(message.pairing);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    // Esperar a que termine la carga antes de aplicar
    if (loading) return;

    // Si hay una combinación de fuentes activa, esta se aplica en su propio
    // efecto y ya establece --font-family-sans (body); no reaplicar la fuente
    // suelta (legacy) para no pisar innecesariamente ese estado.
    if (activePairing) return;

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
  }, [activeFont, activePairing, loading]); // Agregar loading para evitar aplicar antes de que termine la carga

  useEffect(() => {
    // Esperar a que termine la carga antes de aplicar
    if (loading) return;

    // Verificar si el script ya aplicó una combinación desde localStorage
    const scriptAppliedPairing =
      typeof window !== "undefined"
        ? (window as any).__osoria_applied_pairing
        : null;

    // Solo aplicar si tenemos una combinación activa y no se ha aplicado ya
    if (activePairing) {
      // Si el script ya aplicó esta combinación, solo marcar como aplicada sin volver a aplicar
      if (scriptAppliedPairing === activePairing.pairing_name) {
        appliedPairingRef.current = activePairing.pairing_name;
        return;
      }

      // Solo aplicar si no se ha aplicado ya
      if (appliedPairingRef.current !== activePairing.pairing_name) {
        applyPairing(activePairing);
      }
    }
  }, [activePairing, loading]); // Agregar loading para evitar aplicar antes de que termine la carga

  const value: FontContextType = {
    fonts,
    activeFont,
    pairings,
    activePairing,
    loading,
    error,
    changePairing,
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
