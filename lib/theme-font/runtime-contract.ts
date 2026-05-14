import type { ThemeColors } from "@/lib/types/theme";

export interface RuntimeTheme {
  theme_name: string;
  colors: ThemeColors;
  theme_fingerprint: string;
  theme_version_id?: string | null;
  theme_published_at?: string | null;
  store_id?: string | null;
}

export interface RuntimeFont {
  font_name: string;
  font_family: string;
  google_font_url: string | null;
}

export const DEFAULT_RUNTIME_THEME: RuntimeTheme = {
  theme_name: "Claro Original",
  colors: {
    primary: "#005aa1",
    secondary: "#c4faff",
    accent: "#005aa1",
    background: "#ffffff",
    foreground: "#1a1a1a",
    card: "#ffffff",
    cardForeground: "#1a1a1a",
    border: "#e5e5e5",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
  },
  theme_fingerprint: "default:claro-original",
};

const THEME_COLOR_KEYS: (keyof ThemeColors)[] = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "card",
  "cardForeground",
  "border",
  "muted",
  "mutedForeground",
];

export function stableThemeColorsHash(colors: ThemeColors): string {
  const serialized = THEME_COLOR_KEYS.map(
    (key) => `${key}:${colors[key].trim().toLowerCase()}`,
  ).join("|");
  let hash = 5381;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 33) ^ serialized.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function parseJsonIfNeeded(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeThemeColors(value: unknown): ThemeColors | null {
  const raw = toRecord(parseJsonIfNeeded(value));
  if (!raw) return null;

  const primary = readString(raw.primary);
  const secondary = readString(raw.secondary);
  const accent = readString(raw.accent);
  const background = readString(raw.background);
  const foreground = readString(raw.foreground);
  const card = readString(raw.card);
  const cardForeground = readString(raw.cardForeground);
  const border = readString(raw.border);
  const muted = readString(raw.muted);
  const mutedForeground = readString(raw.mutedForeground);

  if (
    !primary ||
    !secondary ||
    !accent ||
    !background ||
    !foreground ||
    !card ||
    !cardForeground ||
    !border ||
    !muted ||
    !mutedForeground
  ) {
    return null;
  }

  return {
    primary,
    secondary,
    accent,
    background,
    foreground,
    card,
    cardForeground,
    border,
    muted,
    mutedForeground,
  };
}

export function normalizeThemeRecord(input: unknown): RuntimeTheme | null {
  const raw = toRecord(input);
  if (!raw) return null;

  const themeName = readString(raw.theme_name);
  const colors = normalizeThemeColors(raw.colors ?? raw.theme_config);

  if (!themeName || !colors) {
    return null;
  }

  const explicitFingerprint = readString(raw.theme_fingerprint);
  const themeId = readString(raw.id ?? raw.theme_id);
  const storeId = readString(raw.store_id);
  const versionId = readString(raw.theme_version_id ?? raw.version_id);
  const updatedAt = readString(raw.updated_at) ?? "unknown";
  const publishedAt = readString(raw.theme_published_at ?? raw.created_at);
  const colorHash = stableThemeColorsHash(colors);
  const themeFingerprint =
    explicitFingerprint ??
    (versionId && storeId && themeId
      ? `v1:${storeId}:${versionId}:${themeId}:${updatedAt}:${colorHash}`
      : `legacy:${themeId ?? themeName}:${updatedAt}:${colorHash}`);

  return {
    theme_name: themeName,
    colors,
    theme_fingerprint: themeFingerprint,
    theme_version_id: versionId,
    theme_published_at: publishedAt,
    store_id: storeId,
  };
}

export function normalizeFontRecord(input: unknown): RuntimeFont | null {
  const raw = toRecord(input);
  if (!raw) return null;

  const fontName = readString(raw.font_name);
  const fontFamily = readString(raw.font_family);

  if (!fontName || !fontFamily) {
    return null;
  }

  const normalizedUrl = readString(raw.google_font_url ?? raw.font_url);

  return {
    font_name: fontName,
    font_family: fontFamily,
    google_font_url: normalizedUrl ?? null,
  };
}
