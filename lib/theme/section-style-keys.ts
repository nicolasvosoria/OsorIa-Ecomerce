import type { ThemeColors } from "@/lib/types/theme"

// Per-section STYLE keys (as opposed to CONTENT) inside a `component_styles`
// row's `variables`. Applying a theme resets only these keys, so a section's
// look adopts the new theme while its content (products, images, texts,
// titles, layout) survives untouched.
//
// This registry GROWS as each section is migrated to consume theme tokens by
// default instead of hardcoding a per-section color/shape. Only sections
// listed here are migrated; everything else keeps its style values as-is on
// theme apply.
export const SECTION_STYLE_KEYS: Record<string, string[]> = {
  products: ["cardBgColor", "cornerRadius", "bgColor", "textColor", "priceColor"],
  featured: ["bgColor", "cardBgColor", "productBgColor", "textColor"],
  specialOffer: [
    "bgColor",
    "accentColor",
    "productBgColor",
    "textColor",
    "sectionBgColor",
  ],
  newsletter: ["buttonColor"],
  hero: ["buttonColor"],
  popular: ["buttonColor"],
  site_background: ["backgroundColor", "backgroundPosition", "type"],
  whyus: [
    "sectionBgColor",
    "cardBgColor",
    "iconBgColor",
    "iconColor",
    "titleColor",
    "subtitleColor",
  ],
  testimonials: [
    "sectionBgColor",
    "cardBgColor",
    "titleColor",
    "subtitleColor",
    "quoteColor",
    "authorColor",
    "roleColor",
  ],
  logos: ["sectionBgColor", "titleColor", "subtitleColor"],
  faq: [
    "sectionBgColor",
    "cardBgColor",
    "borderColor",
    "titleColor",
    "subtitleColor",
    "questionColor",
    "answerColor",
  ],
  video: ["sectionBgColor", "titleColor", "subtitleColor"],
  story: ["sectionBgColor", "titleColor", "subtitleColor", "buttonColor"],
  instagram: ["sectionBgColor", "titleColor", "subtitleColor"],
}

// The `ThemeColors` token each section's "from theme" fallback resolves to,
// keyed by the same `sectionDefinitionKey` output used to store overrides
// (e.g. `hero.button`). Each entry mirrors the literal CSS fallback baked
// into that section's component (e.g. `var(--sec-hero-button, var(--primary))`
// in `hero-view-model.ts`), so the editor can show the real theme color
// instead of a blank swatch when a field has no override yet. `null` marks a
// fallback that isn't a theme color (e.g. `transparent`). Only entries the
// editor currently resolves need to be present; sections not yet migrated to
// this preview are simply absent.
export const SECTION_FIELD_THEME_TOKEN: Record<string, Record<string, keyof ThemeColors | null>> = {
  newsletter: { button: "primary" },
  hero: { button: "primary" },
  popular: { button: "primary" },
  // `text` falls back to `var(--foreground)` directly (unlike `featured`/
  // `specialOffer`, this section doesn't sit on a colored panel, so it reads
  // `foreground` as-is, no contrast resolver involved). `bg` falls back to
  // plain `transparent` — not a theme color — so it maps to `null`.
  products: { cardBg: "muted", bg: null, text: "foreground", price: "primary" },
  // `text` falls back to `var(--secondary-foreground)`, which isn't a stored
  // `ThemeColors` field — it's `contrast.ts`'s `foreground(secondary,
  // baseForeground)`, resolving to the theme's `foreground` for every current
  // palette (all pass the 4.5:1 minimum against `secondary`) — so
  // `foreground` previews the real rendered color here.
  featured: { bg: "secondary", cardBg: "card", productBg: "muted", text: "foreground" },
  // `text` falls back to `var(--secondary-foreground)`, which resolves the
  // same way as `featured.text` above (via `contrast.ts`'s
  // `foreground(secondary, ...)`), so `foreground` previews the real rendered
  // color. `sectionBg` (the outer `<section>` background, distinct from the
  // inner panel's `bg`) falls back to `var(--background)`.
  specialOffer: {
    bg: "secondary",
    accent: "primary",
    productBg: "muted",
    text: "foreground",
    sectionBg: "background",
  },
  // `subtitle` falls back to `var(--muted-foreground)`, which (unlike
  // `featured`/`specialOffer`'s `text`) IS itself a stored `ThemeColors`
  // field, so it maps directly to `mutedForeground` rather than needing a
  // contrast-resolver stand-in.
  whyus: {
    sectionBg: "muted",
    cardBg: "card",
    iconBg: "muted",
    icon: "foreground",
    title: "foreground",
    subtitle: "mutedForeground",
  },
  // Mirrors `whyus`: `quote`/`author` fall back to `var(--foreground)` (the
  // section doesn't sit on a colored panel either), `role`/`subtitle` fall
  // back to `var(--muted-foreground)`, same as `whyus.subtitle`.
  testimonials: {
    sectionBg: "muted",
    cardBg: "card",
    title: "foreground",
    subtitle: "mutedForeground",
    quote: "foreground",
    author: "foreground",
    role: "mutedForeground",
  },
  // Mirrors `whyus`'s `title`/`subtitle` mapping: `title` falls back to
  // `var(--foreground)`, `subtitle` falls back to `var(--muted-foreground)`,
  // in addition to the outer panel background this section already owned.
  logos: { sectionBg: "muted", title: "foreground", subtitle: "mutedForeground" },
  // Mirrors `testimonials`: `cardBg` falls back to `var(--card)`, `title`/
  // `question` fall back to `var(--foreground)`, `subtitle`/`answer` fall
  // back to `var(--muted-foreground)`. `border` IS itself a stored
  // `ThemeColors` field (unlike `whyus`/`testimonials`, which don't expose a
  // themeable border), so it maps directly to `border`.
  faq: {
    sectionBg: "muted",
    cardBg: "card",
    border: "border",
    title: "foreground",
    subtitle: "mutedForeground",
    question: "foreground",
    answer: "mutedForeground",
  },
  // Mirrors `logos`' `sectionBg`/`title`/`subtitle` mapping — same panel
  // background and text-color fallbacks, no extra themeable field beyond those.
  video: { sectionBg: "muted", title: "foreground", subtitle: "mutedForeground" },
  // Mirrors `video`'s `sectionBg`/`title`/`subtitle` mapping, plus a `button`
  // field for the CTA — falls back to `var(--sec-story-button, var(--primary))`,
  // same as `hero`/`newsletter`'s button field.
  story: { sectionBg: "muted", title: "foreground", subtitle: "mutedForeground", button: "primary" },
  // Mirrors `logos`' `sectionBg`/`title`/`subtitle` mapping — same panel
  // background and text-color fallbacks, no extra themeable field beyond those.
  instagram: { sectionBg: "muted", title: "foreground", subtitle: "mutedForeground" },
}

// The `cornerRadius` design key's closed set of presets, shared by
// `ProductsGrid` (which applies the Tailwind class) and the theme editor's
// section design panel (which offers the same presets as a select).
export const PRODUCTS_RADIUS_CLASS: Record<string, string> = {
  none: "rounded-none",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
}

// The CSS length each `PRODUCTS_RADIUS_CLASS` preset resolves to, matching
// this project's Tailwind radius scale (`app/globals.css`'s `--radius-xl:
// calc(var(--radius) + 4px)` with the default `--radius: 0.5rem` for `xl`;
// Tailwind's own default theme for `2xl`/`3xl`, which this project doesn't
// override). Needed because the theme runtime stores the PRESET KEY
// (`none`/`md`/`lg`/`xl`) in `sections.products.cornerRadius`, but the
// `--sec-products-corner-radius` CSS variable `products-grid.tsx` consumes
// must be a LENGTH — emitting the raw key produces invalid CSS
// (`border-radius: lg`), silently ignored by the browser.
export const PRODUCTS_RADIUS_LENGTH: Record<string, string> = {
  none: "0px",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
}

// Canonical per-section CSS-var emission, shared by the runtime bootstrap
// (`lib/theme-font/bootstrap.ts`'s `applyRuntimeTheme`) and the pre-hydration
// inline script (`components/apply-styles-script.tsx`), so both paths run
// the exact same logic instead of two hand-kept-in-sync copies. Given a
// `sections` record and a `setProperty(name, value)` sink, this kebab-cases
// each key and writes `--sec-<section>-<kebab-key>`, applying the
// `products.cornerRadius` preset-key -> CSS length mapping via the
// `productsRadiusLength` map passed in (so `PRODUCTS_RADIUS_LENGTH` above
// stays the only place those values are written).
//
// Following the `createThemeContrastResolver` precedent in
// `lib/theme-font/contrast.ts`: kept module-internal and consumed two ways —
// the bound `sectionStyleApplier` instance below is what `bootstrap.ts`
// imports and calls, while this function is also stringified via
// `.toString()` into `SECTION_STYLE_APPLIER_SOURCE` (for the pre-hydration
// inline script, which can't import a TS module).
function createSectionStyleApplier(
  productsRadiusLength: Record<string, string>,
) {
  function toSectionKebabCase(value: string): string {
    return value.replace(/([A-Z])/g, "-$1").toLowerCase()
  }

  function apply(
    sections: Record<string, Record<string, string>> | null | undefined,
    setProperty: (name: string, value: string) => void,
  ): void {
    if (!sections) return
    Object.keys(sections).forEach((sectionName) => {
      const sectionColors = sections[sectionName]
      if (!sectionColors || typeof sectionColors !== "object") return
      Object.keys(sectionColors).forEach((colorKey) => {
        const colorValue = sectionColors[colorKey]
        // `products.cornerRadius` stores a preset KEY (`none`/`md`/`lg`/`xl`),
        // not a color — `products-grid.tsx` consumes this var as a CSS
        // length, so map the key through `productsRadiusLength` here instead
        // of emitting it verbatim (which would be invalid CSS).
        const resolvedValue =
          sectionName === "products" && colorKey === "cornerRadius"
            ? (productsRadiusLength[colorValue] ?? colorValue)
            : colorValue
        setProperty(
          `--sec-${sectionName}-${toSectionKebabCase(colorKey)}`,
          resolvedValue,
        )
      })
    })
  }

  return { apply }
}

/** Ready-to-use applier bound to this file's `PRODUCTS_RADIUS_LENGTH` — the instance `bootstrap.ts` imports and calls. */
export const sectionStyleApplier = createSectionStyleApplier(PRODUCTS_RADIUS_LENGTH)

/**
 * Stringified source embedding the SAME `createSectionStyleApplier` function
 * plus the SAME `PRODUCTS_RADIUS_LENGTH` values (serialized via `JSON.stringify`
 * at module-eval time, not hand-copied) so `apply-styles-script.tsx`'s
 * pre-hydration inline script runs identical logic. Mirrors
 * `THEME_CONTRAST_HELPER_SOURCE` in `lib/theme-font/contrast.ts`.
 */
export const SECTION_STYLE_APPLIER_SOURCE = `
    var sectionStyleApplier = (${createSectionStyleApplier.toString()})(${JSON.stringify(PRODUCTS_RADIUS_LENGTH)});
`

const COLOR_SUFFIX = "Color"

// Maps a `SECTION_STYLE_KEYS` entry (e.g. `"bgColor"`) to the key it's stored
// under in `ThemeDefinition.sections[section]` (e.g. `"bg"`), which is what
// `apply-styles-script.tsx`/`bootstrap.ts` kebab-case into `--sec-*` vars.
// Established by the first migrated sections (`featured.bg`, `hero.button`,
// etc.), which drop the trailing "Color"; keys without that suffix (e.g.
// `cornerRadius`) pass through unchanged.
export function sectionDefinitionKey(styleKey: string): string {
  return styleKey.endsWith(COLOR_SUFFIX)
    ? styleKey.slice(0, -COLOR_SUFFIX.length)
    : styleKey
}

export function stripSectionStyleKeys(
  componentName: string,
  variables: Record<string, unknown>,
): Record<string, unknown> {
  const styleKeys = SECTION_STYLE_KEYS[componentName]
  if (!styleKeys || styleKeys.length === 0) return variables

  const stripped = { ...variables }
  for (const key of styleKeys) {
    delete stripped[key]
  }
  return stripped
}
