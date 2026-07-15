import { type ReactNode } from "react"

import { FieldError } from "@/components/ui/field-error"
import { Label } from "@/components/ui/label"

// El control lo renderiza quien llama porque cada uno recibe los atributos en un
// sitio distinto (un Input, el trigger de un Select dentro de un Controller).
type FieldControlProps = {
  id: string
  "aria-describedby": string | undefined
  "aria-invalid": true | undefined
}

export function FormField({
  id,
  label,
  labelAdornment,
  hint,
  error,
  children,
}: {
  id: string
  label: ReactNode
  // Va junto al Label, nunca dentro: un trigger de tooltip es un <button>, y el
  // HTML prohíbe elementos labelables dentro de un <label> que no sean su control.
  labelAdornment?: ReactNode
  hint?: ReactNode
  error?: string
  children: (control: FieldControlProps) => ReactNode
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2">
      {labelAdornment ? (
        <div className="flex items-center gap-2">
          <Label htmlFor={id}>{label}</Label>
          {labelAdornment}
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      {children({
        id,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
