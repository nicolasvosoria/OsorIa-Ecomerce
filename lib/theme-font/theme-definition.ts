import type {
  ThemeColors,
  ThemeDefinition,
  ThemeDensity,
  ThemeRadiusScale,
  ThemeShadow,
  ThemeShape,
} from "@/lib/types/theme";

/**
 * Token defaults that reproduce the CURRENT look. `radius.base` and
 * `shape.button` match the values already rendered by `app/globals.css`
 * (`--radius: 0.5rem`), which also drives every shadcn-style component
 * (buttons, inputs) today. `shape.card` instead pins the REAL resting radius
 * of `VisualProductCard` (`components/products/visual-product-card.tsx`),
 * the transversal catalog card — `rounded-3xl` (1.5rem) — since that card
 * never derived its radius from `--radius`. `shadow.card` matches that same
 * card's resting state: no box-shadow at all (it only translates on hover,
 * never gains a shadow). `shadow.elevated` matches that same card's hover
 * state for the same reason: `VisualProductCard` never gained a hover shadow
 * before this token existed, so the default must stay `"none"` too — only
 * the distinctive presets (Minimal/Suave/Bold/Boutique) opt into a real
 * elevated shadow on hover.
 */
export const DEFAULT_THEME_TOKENS: {
  radius: ThemeRadiusScale;
  density: ThemeDensity;
  shadow: ThemeShadow;
  shape: ThemeShape;
} = {
  radius: { base: "0.5rem" },
  density: { scale: 1 },
  shadow: {
    card: "none",
    elevated: "none",
  },
  shape: {
    button: "var(--radius)",
    card: "1.5rem",
  },
};

/**
 * Curated, legible dark palette used ONLY when a theme lacks an explicit dark
 * color set. It is never rendered until a future slice wires up the
 * light/dark mode toggle and a user opts into dark mode.
 */
export const DEFAULT_DARK_FALLBACK: ThemeColors = {
  primary: "#7cc4ff",
  secondary: "#3a4750",
  accent: "#7cc4ff",
  background: "#111111",
  foreground: "#f5f5f5",
  card: "#1a1a1a",
  cardForeground: "#f5f5f5",
  border: "#2e2e2e",
  muted: "#262626",
  mutedForeground: "#b5b5b5",
};

/**
 * The single guarantee of identical-by-default: it takes the legacy 10-color
 * record and lifts it into a `ThemeDefinition` without transforming the
 * colors in any way. `colorsLight` is the input verbatim (even a dark-toned
 * legacy preset keeps today's look), `colorsDark` falls back to a curated
 * palette that only ever renders after a future opt-in, and every token
 * defaults to the current effective value.
 */
export function themeColorsToDefinition(colors: ThemeColors): ThemeDefinition {
  return {
    colorsLight: colors,
    colorsDark: DEFAULT_DARK_FALLBACK,
    ...DEFAULT_THEME_TOKENS,
  };
}
