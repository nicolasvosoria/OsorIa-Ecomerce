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
  specialOffer: ["bgColor", "accentColor", "productBgColor", "textColor"],
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
