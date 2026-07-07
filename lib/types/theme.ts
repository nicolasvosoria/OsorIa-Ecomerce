export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  border: string
  muted: string
  mutedForeground: string
}

export interface AppTheme {
  id: string
  theme_name: string
  colors: ThemeColors
  is_active: boolean
  created_at: string
  updated_at: string
  theme_fingerprint?: string
  theme_version_id?: string | null
  theme_published_at?: string | null
  store_id?: string | null
  /**
   * Additive two-axis bundle. Sourced from the current version's
   * `variables`/`fonts` jsonb when present, otherwise synthesized via
   * `resolveThemeDefinition` so it is always populated and always
   * identical to today's rendered output when no bundle has been stored
   * yet. Existing consumers (e.g. the theme-selector swatch) keep reading
   * `.colors` untouched.
   */
  definition?: ThemeDefinition
}

/**
 * A "mode" is the real light/dark toggle. It selects which color set of a
 * `ThemeDefinition` renders.
 */
export type ThemeMode = "light" | "dark"

export interface ThemeRadiusScale {
  base: string
}

export interface ThemeDensity {
  scale: number
}

export interface ThemeShadow {
  card: string
  elevated: string
}

export interface ThemeShape {
  button: string
  card: string
}

/**
 * One row of a store's theme version history (D3): who it is (custom vs.
 * preset), whether it is the version currently live, and when it was
 * published. Never carries `variables`/`fonts` — those stay server-side.
 */
export interface ThemeVersionSummary {
  id: string
  isCurrent: boolean
  isCustom: boolean
  createdAt: string
  baseThemeName: string
}

/**
 * A "theme" is a design preset spanning both axes: it carries a color set for
 * light AND dark mode plus shared shape/scale tokens. `AppTheme.colors`
 * remains the legacy single (light) color record; `ThemeDefinition` is the
 * additive, two-axis superset built on top of it.
 */
export interface ThemeDefinition {
  colorsLight: ThemeColors
  colorsDark: ThemeColors
  radius: ThemeRadiusScale
  density: ThemeDensity
  shadow: ThemeShadow
  shape: ThemeShape
  fontPairingId?: string | null
  /**
   * Per-section surface colors, keyed by `component_name` (e.g. `"featured"`)
   * then by color key (e.g. `"bg"`, `"cardBg"`). Loose on purpose so sections
   * can opt in incrementally without a schema change; a section with no entry
   * here falls back to its own hardcoded default.
   */
  sections?: Record<string, Record<string, string>>
}
