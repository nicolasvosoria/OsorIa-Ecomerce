/**
 * Single source of truth for each home section's editor label.
 *
 * Replaces three previously scattered sources of the same name:
 * the `label` prop on each `<EditableWrapper>` in
 * `conditional-home-content.tsx`, the `SECTION_NAME_LABELS` map in
 * `theme-editor-sections-tab.tsx`, and any other ad-hoc copy of the
 * same text. Section keys must match the `componentName` passed to
 * `EditableWrapper`.
 */
export interface SectionMeta {
  label: string
}

export const SECTIONS: Record<string, SectionMeta> = {
  hero: { label: "Hero" },
  popular: { label: "Más vendidos" },
  products: { label: "Productos" },
  featured: { label: "Destacados" },
  specialOffer: { label: "Oferta especial" },
  whyus: { label: "Por qué nosotros" },
  newsletter: { label: "Newsletter" },
  footer: { label: "Pie de página" },
  gallery: { label: "Galería de imágenes" },
  about: { label: "Sobre nosotros" },
}

export function sectionLabel(key: string): string {
  return SECTIONS[key]?.label ?? key
}
