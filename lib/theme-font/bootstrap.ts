import {
  DEFAULT_RUNTIME_THEME,
  normalizeFontRecord,
  normalizePairingRecord,
  normalizeThemeRecord,
  type RuntimeFont,
  type RuntimePairing,
  type RuntimeTheme,
} from "@/lib/theme-font/runtime-contract";
import {
  CRITICAL_THEME_CSS_VARIABLES,
  resolveThemeCssVariables,
} from "@/lib/theme-font/contrast";
import { DEFAULT_DARK_FALLBACK } from "@/lib/theme-font/theme-definition";
import type { ThemeMode } from "@/lib/types/theme";

type ThemeBootstrapStatus = "valid" | "missing" | "corrupt" | "stale";

interface ResolveThemeBootstrapOptions {
  fallbackTheme?: RuntimeTheme;
  expectedThemeName?: string | null;
  expectedThemeFingerprint?: string | null;
}

export function resolveThemeBootstrapPayload(
  cachedThemeRaw: string | null,
  options: ResolveThemeBootstrapOptions = {},
): { status: ThemeBootstrapStatus; theme: RuntimeTheme } {
  const fallbackTheme = options.fallbackTheme ?? DEFAULT_RUNTIME_THEME;

  if (!cachedThemeRaw) {
    return { status: "missing", theme: fallbackTheme };
  }

  try {
    const parsed = JSON.parse(cachedThemeRaw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.theme_fingerprint !== "string"
    ) {
      return { status: "stale", theme: fallbackTheme };
    }

    const normalizedTheme = normalizeThemeRecord(parsed);

    if (!normalizedTheme) {
      return { status: "corrupt", theme: fallbackTheme };
    }

    if (
      options.expectedThemeName &&
      options.expectedThemeName.trim().length > 0 &&
      options.expectedThemeName !== normalizedTheme.theme_name
    ) {
      return { status: "stale", theme: fallbackTheme };
    }

    if (
      options.expectedThemeFingerprint &&
      options.expectedThemeFingerprint.trim().length > 0 &&
      options.expectedThemeFingerprint !== normalizedTheme.theme_fingerprint
    ) {
      return { status: "stale", theme: fallbackTheme };
    }

    return { status: "valid", theme: normalizedTheme };
  } catch {
    return { status: "corrupt", theme: fallbackTheme };
  }
}

/** localStorage key for the user's mode preference. Shared with `ModeProvider`. */
export const MODE_STORAGE_KEY = "osoria_mode";
/** matchMedia query for the OS-level dark preference. Shared with `ModeProvider`. */
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

type ModePreference = "light" | "dark" | "system";

/**
 * Reads the user's stored mode preference ("light" | "dark" | "system"),
 * defaulting to "light" when storage is unavailable, unset, or unrecognized
 * (including SSR, where `window` doesn't exist).
 *
 * This is the single source of truth for "read the mode preference from
 * storage" shared by `resolveActiveMode` below and `ModeProvider`
 * (`contexts/mode-context.tsx`), which imports it directly rather than
 * keeping its own copy.
 */
export function readStoredModePreference(): ModePreference {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (privacy mode, disabled storage, etc.): keep the light default.
  }
  return "light";
}

/**
 * Resolves a mode preference to a concrete `ThemeMode`, following a
 * `"system"` preference through `matchMedia`. SSR-safe: falls back to
 * `"light"` when `window`/`matchMedia` is unavailable.
 *
 * Shared by `resolveActiveMode` below and `ModeProvider`, which needs to
 * resolve a preference that hasn't been persisted to storage yet (e.g. the
 * value the user just picked, before `setMode` writes it).
 */
export function resolveModePreference(preference: ModePreference): ThemeMode {
  if (preference !== "system") return preference;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

/**
 * Resolves the CURRENTLY ACTIVE theme mode from storage. Used by
 * `applyRuntimeTheme` whenever a caller doesn't have an explicit mode on
 * hand (e.g. a theme reapply triggered by `theme-context.tsx`, decoupled
 * from `ModeProvider`), so it reflects the user's real mode instead of
 * silently assuming light.
 */
export function resolveActiveMode(): ThemeMode {
  return resolveModePreference(readStoredModePreference());
}

export function applyRuntimeTheme(theme: RuntimeTheme, mode?: ThemeMode): void {
  if (typeof document === "undefined") return;

  const resolvedMode = mode ?? resolveActiveMode();
  const root = document.documentElement;
  const body = document.body;
  const selectedColors =
    resolvedMode === "dark"
      ? (theme.colorsDark ?? DEFAULT_DARK_FALLBACK)
      : (theme.colorsLight ?? theme.colors);
  const resolvedVariables = resolveThemeCssVariables({
    ...theme,
    colors: selectedColors,
  });

  CRITICAL_THEME_CSS_VARIABLES.forEach((variableName) => {
    root.style.setProperty(variableName, resolvedVariables[variableName]);
  });

  if (body) {
    body.style.backgroundColor = resolvedVariables["--background"];
  }

  root.classList.toggle("dark", resolvedMode === "dark");

  // Opt-in shape/shadow tokens (mode-independent). Defaults reproduce the
  // current look byte-for-byte: `--radius`/`--button-radius` already match
  // `app/globals.css`, and `--card-radius`/`--shadow-card` match
  // `VisualProductCard`'s real resting values (see DEFAULT_THEME_TOKENS).
  root.style.setProperty("--radius", theme.radius?.base ?? "0.5rem");
  root.style.setProperty(
    "--button-radius",
    theme.shape?.button ?? "var(--radius)",
  );
  root.style.setProperty("--card-radius", theme.shape?.card ?? "1.5rem");
  root.style.setProperty("--shadow-card", theme.shadow?.card ?? "none");
  root.style.setProperty("--shadow-elevated", theme.shadow?.elevated ?? "none");

  // Density scale (mode-independent). Feeds the global `--spacing` anchor in
  // `app/globals.css`; scale 1 is a no-op against Tailwind's own default.
  root.style.setProperty("--density-scale", String(theme.density?.scale ?? 1));

  // Per-section surface colors (mode-independent for now; dark-mode-specific
  // section palettes are a later concern). Each `theme.sections.<section>`
  // entry becomes `--sec-<section>-<kebab-key>`, e.g. `cardBg` on `featured`
  // writes `--sec-featured-card-bg`.
  Object.entries(theme.sections ?? {}).forEach(([sectionName, sectionColors]) => {
    Object.entries(sectionColors).forEach(([colorKey, colorValue]) => {
      root.style.setProperty(
        `--sec-${sectionName}-${toKebabCase(colorKey)}`,
        colorValue,
      );
    });
  });
}

function toKebabCase(value: string): string {
  return value.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function ensureStylesheetLink(
  url: string,
  targetDocument: Document = document,
): boolean {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return false;

  const existingLink = targetDocument.querySelector(
    `link[href="${normalizedUrl}"]`,
  );
  if (existingLink) {
    return false;
  }

  const link = targetDocument.createElement("link");
  link.rel = "stylesheet";
  link.href = normalizedUrl;
  targetDocument.head.appendChild(link);
  return true;
}

export function shouldLoadFontStylesheet(font: RuntimeFont): boolean {
  if (!font.google_font_url || font.google_font_url.trim().length === 0) {
    return false;
  }

  const lowerName = font.font_name.toLowerCase();
  return lowerName !== "system";
}

export function applyRuntimeFont(input: unknown): RuntimeFont | null {
  if (typeof document === "undefined") return null;

  const font = normalizeFontRecord(input);
  if (!font) return null;

  document.documentElement.style.setProperty(
    "--font-family-sans",
    font.font_family,
  );

  if (shouldLoadFontStylesheet(font)) {
    ensureStylesheetLink(font.google_font_url as string);
  }

  return font;
}

/**
 * Composes a single Google Fonts css2 request for a heading+body pairing.
 * Pure — no `document` access — so it can be reused server-side.
 */
export function buildPairingStylesheetUrl(
  heading: RuntimeFont,
  body: RuntimeFont,
  headingAxis?: string | null,
  bodyAxis?: string | null,
): string | null {
  const trimmedHeadingAxis = headingAxis?.trim();
  const trimmedBodyAxis = bodyAxis?.trim();

  if (!trimmedHeadingAxis || !trimmedBodyAxis) {
    return null;
  }

  return `https://fonts.googleapis.com/css2?family=${trimmedHeadingAxis}&family=${trimmedBodyAxis}&display=swap`;
}

export function applyRuntimePairing(input: unknown): RuntimePairing | null {
  if (typeof document === "undefined") return null;

  const pairing = normalizePairingRecord(input);
  if (!pairing) return null;

  document.documentElement.style.setProperty(
    "--font-family-heading",
    pairing.heading.font_family,
  );
  document.documentElement.style.setProperty(
    "--font-family-sans",
    pairing.body.font_family,
  );

  const combinedUrl = buildPairingStylesheetUrl(
    pairing.heading,
    pairing.body,
    pairing.headingFontAxis,
    pairing.bodyFontAxis,
  );

  if (combinedUrl) {
    ensureStylesheetLink(combinedUrl);
  } else {
    if (shouldLoadFontStylesheet(pairing.heading)) {
      ensureStylesheetLink(pairing.heading.google_font_url as string);
    }
    if (shouldLoadFontStylesheet(pairing.body)) {
      ensureStylesheetLink(pairing.body.google_font_url as string);
    }
  }

  return pairing;
}
