import {
  DEFAULT_RUNTIME_THEME,
  normalizeFontRecord,
  normalizeThemeRecord,
  type RuntimeFont,
  type RuntimeTheme,
} from "@/lib/theme-font/runtime-contract";

type ThemeBootstrapStatus = "valid" | "missing" | "corrupt" | "stale";

interface ResolveThemeBootstrapOptions {
  fallbackTheme?: RuntimeTheme;
  expectedThemeName?: string | null;
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

    return { status: "valid", theme: normalizedTheme };
  } catch {
    return { status: "corrupt", theme: fallbackTheme };
  }
}

export function applyRuntimeTheme(theme: RuntimeTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;
  const colors = theme.colors;

  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--secondary", colors.secondary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.foreground);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--card-foreground", colors.cardForeground);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--muted-foreground", colors.mutedForeground);
  root.style.setProperty("--primary-foreground", colors.foreground);
  root.style.setProperty("--secondary-foreground", colors.foreground);
  root.style.setProperty("--accent-foreground", colors.foreground);

  if (body) {
    body.style.backgroundColor = colors.background;
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
