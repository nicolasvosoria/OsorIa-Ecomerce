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
  type: string;
  options?: SectionFieldOption[];
}

export interface SectionContentField {
  key: string;
  label: string;
  type: string;
  isArray?: boolean;
  arrayFields?: SectionArrayField[];
  options?: SectionFieldOption[];
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
