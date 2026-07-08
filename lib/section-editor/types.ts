// Shared field/registry types for the section editor (drawer + future
// customizer). Kept intentionally decoupled from any state manager: hosts
// (admin-context today, the theme customizer's own staging state later)
// implement `SectionEditorFieldCallbacks` and pass it down to the renderers
// in this module.

export interface SectionFieldOption {
  value: string;
  label: string;
}

export interface SectionArrayField {
  key: string;
  label: string;
  /** "text" | "textarea" | "select" | "image" | "product" | "category" | "datetime" | "number" | "toggle" (boolean switch). */
  type: string;
  options?: SectionFieldOption[];
}

export interface SectionContentField {
  key: string;
  label: string;
  /** "text" | "textarea" | "select" | "image" | "product" | "category" | "datetime" | "number" | "array" | "toggle" (boolean switch). */
  type: string;
  isArray?: boolean;
  arrayFields?: SectionArrayField[];
  options?: SectionFieldOption[];
  /**
   * Which section-panel tab renders this field: `"design"` for the Diseño
   * tab (a layout/variant choice, e.g. columns or a show/hide toggle),
   * anything else — including unset — for the Contenido tab (real content:
   * titles, copy, images, picked items). Storage is unaffected either way:
   * every content field, design-routed or not, still lives in
   * `component_styles.variables`, never in `ThemeDefinition.sections`.
   */
  group?: "design" | "content";
}

export interface SectionStyleField {
  key: string;
  label: string;
  type: string;
  options?: SectionFieldOption[];
}

export interface SectionFieldsConfig {
  content: SectionContentField[];
  styles: SectionStyleField[];
  defaults?: Record<string, any>;
}

/**
 * Minimal seam every section-editor renderer depends on: staging a single
 * field edit. Hosts implement this from whatever storage they use
 * (admin-context's schedule/update-edit today; the customizer's own staging
 * state) and pass it down.
 */
export interface SectionEditorFieldCallbacks {
  onFieldChange: (key: string, value: any) => void;
}
