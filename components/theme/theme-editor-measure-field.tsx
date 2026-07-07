"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deferStateUpdate } from "@/lib/react/defer-state-update"

export interface MeasureStep {
  value: string
  label: string
}

interface MeasureSliderConfig {
  min: number
  max: number
  step: number
  format: (value: string) => string
}

interface MeasureAdvancedConfig {
  validate: (value: string) => boolean
  placeholder: string
  errorMessage: string
}

interface MeasureFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  steps: readonly MeasureStep[]
  slider?: MeasureSliderConfig
  advanced: MeasureAdvancedConfig
  tooltip?: ReactNode
}

/**
 * Figma-like control for a measurement token: named segmented steps for the
 * common values, an optional slider for continuous ranges, and an
 * "Avanzado" exact-value escape for anything else. Segmented and slider
 * changes commit immediately through `onChange` — they can only ever
 * produce a value already known to be valid. The Avanzado input is the only
 * place a value can be invalid, so it drafts locally and only commits (or
 * reverts, with an inline error) on blur.
 */
export function MeasureField({ id, label, value, onChange, steps, slider, advanced, tooltip }: MeasureFieldProps) {
  const labelId = `${id}-label`
  const isCustom = !steps.some((step) => step.value === value)

  const [manuallyExpanded, setManuallyExpanded] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Resyncs the draft when `value` changes from outside this field (a
    // segment/slider commit, or a different theme loading) — deferred so the
    // effect never calls `setState` synchronously during its own render.
    deferStateUpdate(() => {
      setDraft(value)
      setError(null)
    })
  }, [value])

  function commitDraft() {
    if (!advanced.validate(draft)) {
      setError(advanced.errorMessage)
      setDraft(value)
      return
    }
    setError(null)
    onChange(draft)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <Label id={labelId} className="text-xs font-medium">
          {label}
        </Label>
        {tooltip}
      </div>

      <div
        role="group"
        aria-labelledby={labelId}
        className="flex flex-wrap items-center gap-1 rounded-md border bg-background p-1"
      >
        {steps.map((step) => (
          <Button
            key={step.label}
            type="button"
            variant={step.value === value ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            aria-pressed={step.value === value}
            onClick={() => onChange(step.value)}
          >
            {step.label}
          </Button>
        ))}
      </div>

      {slider && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-labelledby={labelId}
            className="h-1.5 flex-1 cursor-pointer accent-primary"
          />
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {slider.format(value)}
          </span>
        </div>
      )}

      <details
        open={isCustom || manuallyExpanded}
        onToggle={(event) => setManuallyExpanded(event.currentTarget.open)}
        className="text-xs"
      >
        <summary className="flex cursor-pointer select-none items-center gap-1 text-muted-foreground [&::-webkit-details-marker]:hidden marker:content-none">
          <span aria-hidden>▸</span> Avanzado
        </summary>
        <div className="mt-1.5 flex flex-col gap-1">
          <Input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setError(null)
            }}
            onBlur={commitDraft}
            placeholder={advanced.placeholder}
            aria-label={`${label} (valor exacto)`}
            spellCheck={false}
            className="h-8 font-mono text-xs"
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </details>
    </div>
  )
}
