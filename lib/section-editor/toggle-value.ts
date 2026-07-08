// Shared coercion for the `toggle` content field type. Stored values come in
// three shapes over a store's lifetime: a real boolean (written by the
// `Switch` control going forward), or the legacy "si"/"no" strings that
// predate it (some fields, e.g. products' `showCategory`/`showPrice`, were
// "si"/"no" selects before migrating to `toggle`). Both the field renderer
// (to compute the switch's checked state) and a section's own render logic
// (to compute the boolean it actually needs) must agree on what counts as on.
export function isToggleOn(value: unknown): boolean {
  return value === true || value === "si" || value === "true" || value === "1"
}
