"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  applyRuntimeTheme,
  DARK_MEDIA_QUERY,
  MODE_STORAGE_KEY,
  readStoredModePreference,
  resolveModePreference,
} from "@/lib/theme-font/bootstrap";
import {
  DEFAULT_RUNTIME_THEME,
  normalizeThemeRecord,
  type RuntimeTheme,
} from "@/lib/theme-font/runtime-contract";
import { deferStateUpdate } from "@/lib/react/defer-state-update";

/**
 * User-facing mode preference. Distinct from `ThemeMode` (`"light" | "dark"`,
 * the resolved axis `applyRuntimeTheme` renders): `"system"` is a preference
 * that resolves to one of those two via `matchMedia`.
 */
type ModePreference = "light" | "dark" | "system";

const ACTIVE_THEME_STORAGE_KEY = "osoria_active_theme";

interface ModeContextType {
  mode: ModePreference;
  isDark: boolean;
  setMode: (next: ModePreference) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

function resolveIsDark(preference: ModePreference): boolean {
  return resolveModePreference(preference) === "dark";
}

function readCachedActiveTheme(): RuntimeTheme {
  try {
    const cached = window.localStorage.getItem(ACTIVE_THEME_STORAGE_KEY);
    if (!cached) return DEFAULT_RUNTIME_THEME;
    return normalizeThemeRecord(JSON.parse(cached)) ?? DEFAULT_RUNTIME_THEME;
  } catch {
    return DEFAULT_RUNTIME_THEME;
  }
}

function applyResolvedMode(isDark: boolean): void {
  applyRuntimeTheme(readCachedActiveTheme(), isDark ? "dark" : "light");
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ModePreference>("light");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const storedMode = readStoredModePreference();
    const resolvedIsDark = resolveIsDark(storedMode);
    applyResolvedMode(resolvedIsDark);
    deferStateUpdate(() => {
      setModeState(storedMode);
      setIsDark(resolvedIsDark);
    });
  }, []);

  useEffect(() => {
    if (mode !== "system") return;

    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDark(event.matches);
      applyResolvedMode(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  const setMode = useCallback((next: ModePreference) => {
    const resolvedIsDark = resolveIsDark(next);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable: the preference still applies for this session.
    }
    setModeState(next);
    setIsDark(resolvedIsDark);
    applyResolvedMode(resolvedIsDark);
  }, []);

  return (
    <ModeContext.Provider value={{ mode, isDark, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextType {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
