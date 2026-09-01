import type {
  ThemeColors,
  ThemeDefinition,
  ThemeDensity,
  ThemeRadiusScale,
  ThemeShadow,
  ThemeShape,
} from "@/lib/types/theme";
import { themeColorsToDefinition } from "@/lib/theme-font/theme-definition";
import { resolveThemeDefinition } from "@/lib/theme-font/theme-presets";

export interface RuntimeTheme {
  theme_name: string;
  colors: ThemeColors;
  theme_fingerprint: string;
  theme_version_id?: string | null;
  theme_published_at?: string | null;
  store_id?: string | null;
  // Two-axis theme system (additive, optional): mirrors `ThemeDefinition` so
  // existing constructions of `RuntimeTheme` (legacy 10-color only) keep
  // typechecking. `normalizeThemeRecord` fills these in via
  // `themeColorsToDefinition` when a record only carries legacy colors.
  colorsLight?: ThemeColors;
  colorsDark?: ThemeColors;
  radius?: ThemeRadiusScale;
  density?: ThemeDensity;
  shadow?: ThemeShadow;
  shape?: ThemeShape;
  fontPairingId?: string | null;
  sections?: Record<string, Record<string, string>>;
}

export interface RuntimeFont {
  font_name: string;
  font_family: string;
  google_font_url: string | null;
}

export interface RuntimePairing {
  pairing_name: string;
  heading: RuntimeFont;
  headingFontAxis: string | null;
  body: RuntimeFont;
  bodyFontAxis: string | null;
}

const DEFAULT_RUNTIME_THEME_COLORS: ThemeColors = {
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
};

// The fallback path stays fully specified on both axes: its resolved light
// output must remain byte-identical to today's, so it is built through the
// same identical-by-default adapter every legacy record goes through.
const DEFAULT_RUNTIME_THEME_DEFINITION = themeColorsToDefinition(
  DEFAULT_RUNTIME_THEME_COLORS,
);

export const DEFAULT_RUNTIME_THEME: RuntimeTheme = {
  theme_name: "Claro Original",
  colors: DEFAULT_RUNTIME_THEME_COLORS,
  theme_fingerprint: "default:claro-original",
  colorsLight: DEFAULT_RUNTIME_THEME_DEFINITION.colorsLight,
  colorsDark: DEFAULT_RUNTIME_THEME_DEFINITION.colorsDark,
  radius: DEFAULT_RUNTIME_THEME_DEFINITION.radius,
  density: DEFAULT_RUNTIME_THEME_DEFINITION.density,
  shadow: DEFAULT_RUNTIME_THEME_DEFINITION.shadow,
  shape: DEFAULT_RUNTIME_THEME_DEFINITION.shape,
  fontPairingId: DEFAULT_RUNTIME_THEME_DEFINITION.fontPairingId ?? null,
  sections: DEFAULT_RUNTIME_THEME_DEFINITION.sections,
};

export const THEME_COLOR_KEYS: (keyof ThemeColors)[] = [
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

function readIdentifier(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "bigint") {
    return String(value);
  }
  return readString(value);
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

function normalizeThemeRadius(value: unknown): ThemeRadiusScale | null {
  const raw = toRecord(parseJsonIfNeeded(value));
  if (!raw) return null;
  const base = readString(raw.base);
  return base ? { base } : null;
}

function normalizeThemeDensity(value: unknown): ThemeDensity | null {
  const raw = toRecord(parseJsonIfNeeded(value));
  if (!raw) return null;
  const scale =
    typeof raw.scale === "number" && Number.isFinite(raw.scale)
      ? raw.scale
      : null;
  return scale !== null ? { scale } : null;
}

function normalizeThemeShadow(value: unknown): ThemeShadow | null {
  const raw = toRecord(parseJsonIfNeeded(value));
  if (!raw) return null;
  const card = readString(raw.card);
  const elevated = readString(raw.elevated);
  return card && elevated ? { card, elevated } : null;
}

function normalizeThemeShape(value: unknown): ThemeShape | null {
  const raw = toRecord(parseJsonIfNeeded(value));
  if (!raw) return null;
  const button = readString(raw.button);
  const card = readString(raw.card);
  return button && card ? { button, card } : null;
}

function normalizeThemeSections(
  value: unknown,
): Record<string, Record<string, string>> | null {
  const raw = toRecord(parseJsonIfNeeded(value));
  if (!raw) return null;

  const sections: Record<string, Record<string, string>> = {};
  for (const [sectionName, sectionColors] of Object.entries(raw)) {
    const rawSectionColors = toRecord(sectionColors);
    if (!rawSectionColors) continue;

    const normalizedColors: Record<string, string> = {};
    for (const [colorKey, colorValue] of Object.entries(rawSectionColors)) {
      const normalizedValue = readString(colorValue);
      if (normalizedValue) normalizedColors[colorKey] = normalizedValue;
    }

    if (Object.keys(normalizedColors).length > 0) {
      sections[sectionName] = normalizedColors;
    }
  }

  return Object.keys(sections).length > 0 ? sections : null;
}

export function normalizeThemeDefinition(input: unknown): ThemeDefinition | null {
  const raw = toRecord(parseJsonIfNeeded(input));
  if (!raw) return null;

  const colorsLight = normalizeThemeColors(raw.colorsLight);
  const colorsDark = normalizeThemeColors(raw.colorsDark);
  const radius = normalizeThemeRadius(raw.radius);
  const density = normalizeThemeDensity(raw.density);
  const shadow = normalizeThemeShadow(raw.shadow);
  const shape = normalizeThemeShape(raw.shape);

  if (!colorsLight || !colorsDark || !radius || !density || !shadow || !shape) {
    return null;
  }

  return {
    colorsLight,
    colorsDark,
    radius,
    density,
    shadow,
    shape,
    fontPairingId: readString(raw.fontPairingId ?? raw.font_pairing_id) ?? null,
    sections: normalizeThemeSections(raw.sections) ?? undefined,
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
  const themeId = readIdentifier(raw.id ?? raw.theme_id);
  const storeId = readIdentifier(raw.store_id);
  const versionId = readIdentifier(raw.theme_version_id ?? raw.version_id);
  const updatedAt = readString(raw.updated_at) ?? "unknown";
  const publishedAt = readString(raw.theme_published_at ?? raw.created_at);
  const colorHash = stableThemeColorsHash(colors);
  const themeFingerprint =
    explicitFingerprint ??
    (versionId && storeId && themeId
      ? `v1:${storeId}:${versionId}:${themeId}:${updatedAt}:${colorHash}`
      : `legacy:${themeId ?? themeName}:${updatedAt}:${colorHash}`);

  // Records only ever carry the legacy 10-color set today, so this always
  // synthesizes the definition via the preset-aware, identical-by-default
  // resolver (light output stays byte-identical; only colorsDark/tokens may
  // vary by theme_name). The explicit reads below exist so that a future
  // record carrying its own two-axis definition/variables bundle is
  // preferred over the synthesized one, without requiring any change to
  // this normalizer later.
  const synthesizedDefinition = resolveThemeDefinition(themeName, colors);
  const colorsLight =
    normalizeThemeColors(raw.colorsLight) ?? synthesizedDefinition.colorsLight;
  const colorsDark =
    normalizeThemeColors(raw.colorsDark) ?? synthesizedDefinition.colorsDark;
  const radius = normalizeThemeRadius(raw.radius) ?? synthesizedDefinition.radius;
  const density =
    normalizeThemeDensity(raw.density) ?? synthesizedDefinition.density;
  const shadow = normalizeThemeShadow(raw.shadow) ?? synthesizedDefinition.shadow;
  const shape = normalizeThemeShape(raw.shape) ?? synthesizedDefinition.shape;
  const fontPairingId =
    readString(raw.fontPairingId ?? raw.font_pairing_id) ??
    synthesizedDefinition.fontPairingId ??
    null;
  const sections =
    normalizeThemeSections(raw.sections) ?? synthesizedDefinition.sections;

  return {
    theme_name: themeName,
    colors,
    theme_fingerprint: themeFingerprint,
    theme_version_id: versionId,
    theme_published_at: publishedAt,
    store_id: storeId,
    colorsLight,
    colorsDark,
    radius,
    density,
    shadow,
    shape,
    fontPairingId,
    sections,
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

export function normalizePairingRecord(input: unknown): RuntimePairing | null {
  const raw = toRecord(input);
  if (!raw) return null;

  const pairingName = readString(raw.pairing_name);
  if (!pairingName) return null;

  const headingRaw = toRecord(raw.heading);
  const bodyRaw = toRecord(raw.body);

  const heading = normalizeFontRecord(
    headingRaw ?? {
      font_name: raw.heading_font_name,
      font_family: raw.heading_font_family,
      google_font_url: raw.heading_google_font_url,
    },
  );
  const body = normalizeFontRecord(
    bodyRaw ?? {
      font_name: raw.body_font_name,
      font_family: raw.body_font_family,
      google_font_url: raw.body_google_font_url,
    },
  );

  if (!heading || !body) return null;

  const headingFontAxis = readString(
    headingRaw ? headingRaw.font_axis : raw.heading_font_axis,
  );
  const bodyFontAxis = readString(
    bodyRaw ? bodyRaw.font_axis : raw.body_font_axis,
  );

  return {
    pairing_name: pairingName,
    heading,
    headingFontAxis,
    body,
    bodyFontAxis,
  };
}
