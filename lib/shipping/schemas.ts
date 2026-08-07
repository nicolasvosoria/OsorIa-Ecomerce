import { z } from "zod"

// A3: stored values are frozen English identifiers -- Spanish only shows up in
// the label the UI renders (lib/i18n/translations.ts).
export const SHIPPING_MODES = ["coordinate", "own_rates", "auto_quote"] as const

export type ShippingMode = (typeof SHIPPING_MODES)[number]

// D11: auto_quote has no strategy behind it yet, so the admin selector never
// offers it -- an owner must not be able to pick a mode with nothing behind it.
export const SELECTABLE_SHIPPING_MODES = ["coordinate", "own_rates"] as const satisfies readonly ShippingMode[]

export type SelectableShippingMode = (typeof SELECTABLE_SHIPPING_MODES)[number]

export const shippingModeFormSchema = z.object({
  mode: z.enum(SELECTABLE_SHIPPING_MODES),
})

export type ShippingModeFormValues = z.infer<typeof shippingModeFormSchema>

// A stored mode can be auto_quote (D11's modeled-but-not-yet-offered value)
// even though nothing writes it today, so the form -- which only knows the
// two selectable modes -- falls back to the born default rather than crash.
export function toSelectableShippingMode(mode: ShippingMode): SelectableShippingMode {
  return (SELECTABLE_SHIPPING_MODES as readonly ShippingMode[]).includes(mode)
    ? (mode as SelectableShippingMode)
    : "coordinate"
}

// The one place a stored mode maps to which lib/i18n/translations.ts key names
// its label (D31) -- both the form's Select and the settings summary read
// through this instead of each keeping its own mode-to-label mapping.
export function shippingModeLabelKey(mode: ShippingMode): "modeCoordinate" | "modeOwnRates" {
  return toSelectableShippingMode(mode) === "own_rates" ? "modeOwnRates" : "modeCoordinate"
}
