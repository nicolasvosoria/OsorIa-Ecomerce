import { useCallback, type ReactNode } from "react"
import { Pipette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useHasHydrated } from "@/lib/hooks/use-has-hydrated"

const EYE_DROPPER_UNSUPPORTED_MESSAGE =
  "Disponible solo en navegadores basados en Chromium (Chrome/Edge)."

interface ColorFieldProps {
  id: string
  label: string
  value: string
  onChange?: (value: string) => void
  disabled?: boolean
  tooltip?: ReactNode
  /**
   * The theme color this field falls back to when `value` is empty (no
   * override set yet). When provided, the swatch/inputs show this real color
   * instead of rendering blank, so "inherited" reads as the actual theme
   * color rather than an empty box. Picking a color still writes through
   * `onChange` as today — this only affects what's displayed while there's
   * no override.
   */
  inheritedColor?: string
  /**
   * Renders the old compact swatch + hex + eyedropper row instead of opening
   * a popover. `ShadowField`'s "Color" control already lives inside its own
   * popover, and stacking a second popover there is awkward UX (nested focus
   * traps, portals competing for the same click-outside), so it keeps the
   * inline row instead of the new popover trigger.
   */
  inline?: boolean
}

// The native `window.EyeDropper` API isn't in the DOM lib types yet, so this
// is the minimal shape needed here (avoids sprinkling `any`).
interface EyeDropperOpenResult {
  sRGBHex: string
}

interface EyeDropperInstance {
  open(): Promise<EyeDropperOpenResult>
}

declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperInstance
  }
}

// `window.EyeDropper` is unavailable during SSR, and only Chromium browsers
// support it on the client. Gating the check behind `useHasHydrated` keeps
// the first client render identical to the server render, so React never
// reports a hydration mismatch. The pipette button itself always renders — on
// unsupported browsers (Firefox/Safari) it's disabled with a tooltip
// explaining why, instead of silently disappearing; the native color input
// remains the fallback there.

interface EyeDropperButtonProps {
  disabled?: boolean
  supportsEyeDropper: boolean
  onPick: () => void
  className?: string
  ariaLabel?: string
  children?: ReactNode
}

// Shared by the inline row and the popover: same disabled/tooltip gating
// either way, only the size and the optional visible label change.
function EyeDropperButton({
  disabled,
  supportsEyeDropper,
  onPick,
  className,
  ariaLabel,
  children,
}: EyeDropperButtonProps) {
  const button = (
    <Button
      type="button"
      variant="outline"
      size={children ? "sm" : "icon-sm"}
      className={className}
      disabled={disabled || !supportsEyeDropper}
      onClick={onPick}
      aria-label={children ? undefined : ariaLabel}
    >
      <Pipette className="h-4 w-4" />
      {children}
    </Button>
  )

  if (supportsEyeDropper) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent className="editor-chrome max-w-[220px] text-xs" side="top">
        {EYE_DROPPER_UNSUPPORTED_MESSAGE}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Color value editor. Clicking the swatch trigger opens a popover with a
 * large native color picker, a hex text field and the eyedropper — all three
 * commit through the same `onChange`, so picking a color repaints the live
 * preview identically no matter which control was used. No shadcn/ui
 * equivalent exists in this codebase (`components/ui/color-picker` is a
 * palette swatch picker, not a value editor), so this is a local control
 * built specifically for this purpose.
 */
export function ColorField({
  id,
  label,
  value,
  onChange,
  disabled,
  tooltip,
  inline,
  inheritedColor,
}: ColorFieldProps) {
  const labelId = `${id}-label`
  const hasHydrated = useHasHydrated()
  const supportsEyeDropper = hasHydrated && typeof window !== "undefined" && "EyeDropper" in window
  // While there's no override, show the real theme color everywhere the empty
  // `value` would otherwise render blank; picking a color still writes the
  // raw `value` through `onChange` (an explicit override), untouched below.
  const displayValue = value || inheritedColor || ""

  // Propagates through the SAME `onChange` the color input uses, so picking a
  // color updates the theme/section design (and repaints the live preview)
  // identically to typing a hex value or dragging the native swatch.
  const handleEyeDropper = useCallback(async () => {
    const EyeDropperCtor = window.EyeDropper
    if (!EyeDropperCtor) return
    try {
      const { sRGBHex } = await new EyeDropperCtor().open()
      onChange?.(sRGBHex)
    } catch {
      // The promise rejects when the user cancels (Escape) — no-op.
    }
  }, [onChange])

  if (inline) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label id={labelId} className="text-xs font-medium">
            {label}
          </Label>
          {tooltip}
        </div>
        <div className="flex items-center gap-2" role="group" aria-labelledby={labelId}>
          <input
            type="color"
            value={displayValue}
            disabled={disabled}
            onChange={(event) => onChange?.(event.target.value)}
            aria-label={`${label} (selector de color)`}
            className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <EyeDropperButton
            disabled={disabled}
            supportsEyeDropper={supportsEyeDropper}
            onPick={handleEyeDropper}
            className="h-8 w-8 shrink-0"
            ariaLabel="Seleccionar color de la pantalla"
          />
          <Input
            value={displayValue}
            disabled={disabled}
            onChange={(event) => onChange?.(event.target.value)}
            aria-label={`${label} (valor hexadecimal)`}
            spellCheck={false}
            className="h-8 flex-1 font-mono text-xs"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <Label id={labelId} className="text-xs font-medium">
          {label}
        </Label>
        {tooltip}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Editar color: ${label}`}
            className="flex items-center gap-2 rounded-md border border-input px-2 py-1.5 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              aria-hidden
              className="h-8 w-8 shrink-0 rounded-md border border-input shadow-sm"
              style={{ backgroundColor: displayValue }}
            />
            <span className="font-mono text-xs text-muted-foreground">{displayValue}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="editor-chrome w-64 space-y-3" align="start">
          <input
            type="color"
            value={displayValue}
            disabled={disabled}
            onChange={(event) => onChange?.(event.target.value)}
            aria-label={`${label} (selector de color)`}
            className="h-32 w-full cursor-pointer rounded-md border border-input bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex items-center gap-2">
            <Input
              value={displayValue}
              disabled={disabled}
              onChange={(event) => onChange?.(event.target.value)}
              aria-label={`${label} (valor hexadecimal)`}
              placeholder="#RRGGBB"
              spellCheck={false}
              className="h-9 flex-1 font-mono text-xs"
            />
            <EyeDropperButton
              disabled={disabled}
              supportsEyeDropper={supportsEyeDropper}
              onPick={handleEyeDropper}
              className="shrink-0"
            >
              Cuentagotas
            </EyeDropperButton>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
