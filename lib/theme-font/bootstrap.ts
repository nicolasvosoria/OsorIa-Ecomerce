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

export function applyRuntimeTheme(theme: RuntimeTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;
  const resolvedVariables = resolveThemeCssVariables(theme);

  CRITICAL_THEME_CSS_VARIABLES.forEach((variableName) => {
    root.style.setProperty(variableName, resolvedVariables[variableName]);
  });

  if (body) {
    body.style.backgroundColor = resolvedVariables["--background"];
  }
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
