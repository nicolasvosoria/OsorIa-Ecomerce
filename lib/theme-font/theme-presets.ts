import type { ThemeColors, ThemeDefinition } from "@/lib/types/theme";
import { themeColorsToDefinition } from "@/lib/theme-font/theme-definition";

/**
 * Per-theme overrides layered on top of the identical-by-default adapter.
 * `colorsLight` is intentionally excluded: the light set always comes from
 * the DB row (`ecommerce.app_themes.colors`) so it can never drift from
 * today's output. `fontPairingId` stays `null` for every preset in this
 * slice; wiring real pairings is a later step.
 */
export type ThemePresetOverride = Partial<
  Pick<
    ThemeDefinition,
    | "colorsDark"
    | "radius"
    | "density"
    | "shadow"
    | "shape"
    | "fontPairingId"
    | "sections"
  >
>;

const TECH_DARK_PALETTE: ThemeColors = {
  primary: "#3b8eea",
  secondary: "#1b222c",
  accent: "#ff7b54",
  background: "#0d1117",
  foreground: "#e6edf3",
  card: "#161b22",
  cardForeground: "#e6edf3",
  border: "#2a313c",
  muted: "#1b222c",
  mutedForeground: "#93a0b1",
};

const MINIMAL_DARK_PALETTE: ThemeColors = {
  primary: "#ebe9e2",
  secondary: "#26261f",
  accent: "#b0ab99",
  background: "#161613",
  foreground: "#ebe9e2",
  card: "#1e1e1a",
  cardForeground: "#ebe9e2",
  border: "#30302a",
  muted: "#24241d",
  mutedForeground: "#96937f",
};

const SUAVE_DARK_PALETTE: ThemeColors = {
  primary: "#f58aa0",
  secondary: "#3a2f2c",
  accent: "#74c1b0",
  background: "#241f1e",
  foreground: "#f3e9e5",
  card: "#2e2725",
  cardForeground: "#f3e9e5",
  border: "#40342f",
  muted: "#372d2b",
  mutedForeground: "#b7a9a3",
};

const BOLD_DARK_PALETTE: ThemeColors = {
  primary: "#fafafa",
  secondary: "#1c1c1c",
  accent: "#ffe600",
  background: "#0a0a0a",
  foreground: "#fafafa",
  card: "#151515",
  cardForeground: "#fafafa",
  border: "#fafafa",
  muted: "#1c1c1c",
  mutedForeground: "#9a9a9a",
};

const BOUTIQUE_DARK_PALETTE: ThemeColors = {
  primary: "#d0805f",
  secondary: "#3a2a1d",
  accent: "#9aac6f",
  background: "#241a12",
  foreground: "#f0e4d5",
  card: "#2e2118",
  cardForeground: "#f0e4d5",
  border: "#43301f",
  muted: "#372718",
  mutedForeground: "#b7a488",
};

/**
 * Registry of overrides keyed by the 5 real design presets. "Tech" is the
 * default and only overrides `shape.button` (unified to the shared
 * `--button-radius` pill token so every theme's buttons/inputs consume the
 * same token) plus a curated `colorsDark`; `radius`/`density`/`shadow` still
 * inherit `DEFAULT_THEME_TOKENS`, so Tech's light output stays otherwise
 * byte-identical to today's. The other 4 presets only render their
 * distinctive tokens once a shop selects them.
 */
export const THEME_PRESETS: Record<string, ThemePresetOverride> = {
  Tech: {
    colorsDark: TECH_DARK_PALETTE,
    shape: { button: "9999px", card: "1.5rem" },
    fontPairingId: null,
    sections: {
      featured: { bg: "#7baeaf", cardBg: "#f6f6f6", productBg: "#77767b", text: "#ffffff" },
      specialOffer: { bg: "#ed333b", accent: "#f5c211", productBg: "#f66151", text: "#ffffff" },
      newsletter: { button: "#c01c28" },
      hero: { button: "#33d17a" },
      popular: { button: "#33d17a" },
    },
  },
  Minimal: {
    colorsDark: MINIMAL_DARK_PALETTE,
    radius: { base: "0px" },
    density: { scale: 1.14 },
    shadow: { card: "none", elevated: "0 0 0 1px var(--border)" },
    shape: { button: "0px", card: "0px" },
    fontPairingId: null,
    sections: {
      featured: { bg: "#eceae5", cardBg: "#fdfdfb", productBg: "#d8d5cc", text: "#1b1b18" },
      specialOffer: { bg: "#1b1b18", accent: "#8a8574", productBg: "#2a2a26", text: "#f6f5f2" },
      newsletter: { button: "#1b1b18" },
      hero: { button: "#1b1b18" },
      popular: { button: "#1b1b18" },
    },
  },
  Suave: {
    colorsDark: SUAVE_DARK_PALETTE,
    radius: { base: "1.25rem" },
    density: { scale: 1.06 },
    shadow: {
      card: "0 8px 24px -6px rgba(158,101,110,.22)",
      elevated: "0 18px 44px -12px rgba(158,101,110,.32)",
    },
    shape: { button: "9999px", card: "1.25rem" },
    fontPairingId: null,
    sections: {
      featured: { bg: "#fdeef0", cardBg: "#ffffff", productBg: "#f6d3da", text: "#4a3b34" },
      specialOffer: { bg: "#ec6a80", accent: "#ffd166", productBg: "#f58aa0", text: "#ffffff" },
      newsletter: { button: "#ec6a80" },
      hero: { button: "#ec6a80" },
      popular: { button: "#ec6a80" },
    },
  },
  Bold: {
    colorsDark: BOLD_DARK_PALETTE,
    radius: { base: "0.15rem" },
    density: { scale: 0.97 },
    shadow: { card: "4px 4px 0 var(--border)", elevated: "7px 7px 0 var(--border)" },
    shape: { button: "0.15rem", card: "0.15rem" },
    fontPairingId: null,
    sections: {
      featured: { bg: "#0a0a0a", cardBg: "#161616", productBg: "#262626", text: "#fafafa" },
      specialOffer: { bg: "#0a0a0a", accent: "#ffe600", productBg: "#1c1c1c", text: "#ffffff" },
      newsletter: { button: "#ff2d55" },
      hero: { button: "#0a0a0a" },
      popular: { button: "#0a0a0a" },
    },
  },
  Boutique: {
    colorsDark: BOUTIQUE_DARK_PALETTE,
    radius: { base: "0.75rem" },
    density: { scale: 1.05 },
    shadow: {
      card: "0 6px 18px -6px rgba(74,53,39,.2)",
      elevated: "0 16px 34px -12px rgba(74,53,39,.3)",
    },
    shape: { button: "0.5rem", card: "0.9rem" },
    fontPairingId: null,
    sections: {
      featured: { bg: "#f2e5d5", cardBg: "#fffaf3", productBg: "#e6d5bf", text: "#4a3527" },
      specialOffer: { bg: "#b0603f", accent: "#e8b04b", productBg: "#c47a5c", text: "#fff8f1" },
      newsletter: { button: "#b0603f" },
      hero: { button: "#b0603f" },
      popular: { button: "#b0603f" },
    },
  },
};

function normalizePresetKey(name: string): string {
  return name.trim().toLowerCase();
}

const PRESET_LOOKUP = new Map(
  Object.entries(THEME_PRESETS).map(([name, override]) => [
    normalizePresetKey(name),
    override,
  ]),
);

export function resolveThemeDefinition(
  themeName: string | null | undefined,
  colors: ThemeColors,
): ThemeDefinition {
  const base = themeColorsToDefinition(colors);
  const override = themeName
    ? PRESET_LOOKUP.get(normalizePresetKey(themeName))
    : undefined;

  if (!override) {
    return base;
  }

  return { ...base, ...override, colorsLight: base.colorsLight };
}
