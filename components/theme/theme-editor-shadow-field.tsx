"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ColorField } from "@/components/theme/theme-editor-fields"
import { deferStateUpdate } from "@/lib/react/defer-state-update"
import {
  composeBoxShadow,
  hexToShadowColor,
  parseBoxShadow,
  shadowColorToHex,
  type ShadowParts,
} from "@/lib/theme/shadow-format"

export interface ShadowPreset {
  value: string
  label: string
}

// Offset X/Y and spread all move the shadow shape by a px amount, so they
// share one practical bound; blur only ever grows, with its own larger cap.
const OFFSET_BOUND = 32
const BLUR_MAX = 64
const ALPHA_STEP = 0.01

interface ShadowFieldProps {
  id: string
  label: string
  value: string
  presets: readonly ShadowPreset[]
  onChange: (value: string) => void
  tooltip?: ReactNode
}

interface ShadowSliderProps {
  id: string
  label: string
  min: number
  max: number
  step?: number
  value: number
  format: (value: number) => string
  onChange: (value: number) => void
}

function ShadowSlider({ id, label, min, max, step = 1, value, format, onChange }: ShadowSliderProps) {
  const labelId = `${id}-label`
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Label id={labelId} className="text-xs font-medium">
          {label}
        </Label>
        <span className="text-xs tabular-nums text-muted-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-labelledby={labelId}
        className="h-1.5 w-full cursor-pointer accent-primary"
      />
    </div>
  )
}

function resolveParts(value: string, fallbackPreset: string): ShadowParts {
  return parseBoxShadow(value) ?? (parseBoxShadow(fallbackPreset) as ShadowParts)
}

/**
 * Figma-like shadow builder: a trigger row with a live swatch and a
 * "Personalizar sombra" button opening a popover of bounded controls (offset,
 * blur, spread, color, opacity) plus preset starting points. Every control
 * commits through `composeBoxShadow`, so the field can never emit an invalid
 * `box-shadow` string — no free-text escape hatch is needed here.
 */
export function ShadowField({ id, label, value, presets, onChange, tooltip }: ShadowFieldProps) {
  const labelId = `${id}-label`
  const fallbackPreset = presets.find((preset) => preset.value !== "none")?.value ?? "none"
  const [parts, setParts] = useState<ShadowParts>(() => resolveParts(value, fallbackPreset))

  useEffect(() => {
    deferStateUpdate(() => setParts(resolveParts(value, fallbackPreset)))
  }, [value, fallbackPreset])

  function commit(nextParts: ShadowParts) {
    setParts(nextParts)
    onChange(composeBoxShadow(nextParts))
  }

  function selectPreset(preset: string) {
    if (preset === "none") {
      onChange("none")
      return
    }
    const presetParts = parseBoxShadow(preset)
    if (presetParts) commit(presetParts)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <Label id={labelId} className="text-xs font-medium">
          {label}
        </Label>
        {tooltip}
      </div>
      <div className="flex items-center gap-3" role="group" aria-labelledby={labelId}>
        <span
          aria-hidden
          className="h-10 w-10 shrink-0 rounded-md border bg-card"
          style={{ boxShadow: value }}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              Personalizar sombra
            </Button>
          </PopoverTrigger>
          <PopoverContent className="editor-chrome w-80 space-y-4" align="start">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preajustes de sombra">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={preset.value === value ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={preset.value === value}
                  onClick={() => selectPreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <ShadowSlider
              id={`${id}-offset-x`}
              label="Desplazamiento X"
              min={-OFFSET_BOUND}
              max={OFFSET_BOUND}
              value={parts.x}
              format={(v) => `${v}px`}
              onChange={(x) => commit({ ...parts, x })}
            />
            <ShadowSlider
              id={`${id}-offset-y`}
              label="Desplazamiento Y"
              min={-OFFSET_BOUND}
              max={OFFSET_BOUND}
              value={parts.y}
              format={(v) => `${v}px`}
              onChange={(y) => commit({ ...parts, y })}
            />
            <ShadowSlider
              id={`${id}-blur`}
              label="Desenfoque"
              min={0}
              max={BLUR_MAX}
              value={parts.blur}
              format={(v) => `${v}px`}
              onChange={(blur) => commit({ ...parts, blur })}
            />
            <ShadowSlider
              id={`${id}-spread`}
              label="Expansión"
              min={-OFFSET_BOUND}
              max={OFFSET_BOUND}
              value={parts.spread}
              format={(v) => `${v}px`}
              onChange={(spread) => commit({ ...parts, spread })}
            />

            <ColorField
              id={`${id}-color`}
              label="Color"
              value={shadowColorToHex(parts.color)}
              onChange={(hex) => commit({ ...parts, color: hexToShadowColor(hex) })}
              inline
            />

            <ShadowSlider
              id={`${id}-alpha`}
              label="Opacidad"
              min={0}
              max={1}
              step={ALPHA_STEP}
              value={parts.alpha}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(alpha) => commit({ ...parts, alpha })}
            />

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
              <div className="flex h-16 items-center justify-center rounded-md bg-muted">
                <span
                  aria-hidden
                  className="h-10 w-16 rounded-md border bg-card"
                  style={{ boxShadow: composeBoxShadow(parts) }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
