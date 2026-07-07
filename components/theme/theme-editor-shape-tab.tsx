import { isValidLength } from "@/lib/theme/measure-format"
import type { ThemeDefinition } from "@/lib/types/theme"
import { InfoTooltip } from "@/components/theme/info-tooltip"
import { MeasureField, type MeasureStep } from "@/components/theme/theme-editor-measure-field"
import { ShadowField, type ShadowPreset } from "@/components/theme/theme-editor-shadow-field"

const DENSITY_MIN = 0.9
const DENSITY_MAX = 1.2
const DENSITY_STEP = 0.01

// Source of truth for the radius scale, paired with a human label for the
// segmented control. "Máximo" covers the `shape.card` default (1.5rem) so it
// maps to a named step.
const RADIUS_STEPS: readonly MeasureStep[] = [
  { value: "0px", label: "Recto" },
  { value: "0.15rem", label: "Suave" },
  { value: "0.5rem", label: "Medio" },
  { value: "0.75rem", label: "Redondo" },
  { value: "1.25rem", label: "Muy redondo" },
  { value: "1.5rem", label: "Máximo" },
]

// "Igual que base" covers the `shape.button` default (`var(--radius)`) so it
// maps to a named step.
const BUTTON_RADIUS_STEPS: readonly MeasureStep[] = [
  { value: "var(--radius)", label: "Igual que base" },
  ...RADIUS_STEPS,
  { value: "9999px", label: "Pastilla" },
]

const DENSITY_STEPS: readonly MeasureStep[] = [
  { value: "0.9", label: "Compacto" },
  { value: "1", label: "Cómodo" },
  { value: "1.1", label: "Amplio" },
  { value: "1.2", label: "Espacioso" },
]

const RADIUS_ERROR = "Usa 0, o un número con unidad px, rem o em (ej. 0.75rem)."

const RADIUS_BASE_TOOLTIP =
  "Redondeo por defecto de tarjetas, inputs y contenedores. Afecta todo el sitio."
const DENSITY_TOOLTIP =
  "Ajusta el espaciado y tamaño general de los elementos. Afecta todo el sitio."
const SHADOW_CARD_TOOLTIP =
  "Sombra que usan las tarjetas de producto y contenido. Afecta todo el sitio."
const SHADOW_ELEVATED_TOOLTIP =
  "Sombra de elementos flotantes, como menús y modales. Afecta todo el sitio."
const BUTTON_RADIUS_TOOLTIP = "Redondeo de esquinas de los botones. Afecta todo el sitio."
const CARD_RADIUS_TOOLTIP = "Redondeo de esquinas de las tarjetas. Afecta todo el sitio."

function isValidDensity(raw: string): boolean {
  const scale = Number(raw)
  return raw.trim() !== "" && Number.isFinite(scale) && scale >= DENSITY_MIN && scale <= DENSITY_MAX
}

const SHADOW_OPTIONS: readonly ShadowPreset[] = [
  { value: "none", label: "Ninguna" },
  { value: "0 1px 3px rgba(0,0,0,.08)", label: "Sutil" },
  { value: "0 6px 16px -4px rgba(0,0,0,.16)", label: "Media" },
  { value: "0 16px 32px -8px rgba(0,0,0,.28)", label: "Marcada" },
]

type DefinitionUpdater = (prev: ThemeDefinition) => ThemeDefinition

interface FormaTabProps {
  definition: ThemeDefinition
  onUpdateDefinition: (updater: DefinitionUpdater) => void
}

function GroupHeading({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold uppercase text-muted-foreground">{children}</h3>
}

export function FormaTab({ definition, onUpdateDefinition }: FormaTabProps) {
  return (
    <div className="space-y-5 pt-3">
      <div className="space-y-4">
        <GroupHeading>Radios</GroupHeading>

        <MeasureField
          id="radius-base"
          label="Radio base"
          value={definition.radius.base}
          steps={RADIUS_STEPS}
          advanced={{ validate: isValidLength, placeholder: "ej. 0.35rem", errorMessage: RADIUS_ERROR }}
          tooltip={<InfoTooltip label="Sobre el radio base" content={RADIUS_BASE_TOOLTIP} />}
          onChange={(value) =>
            onUpdateDefinition((prev) => ({ ...prev, radius: { base: value } }))
          }
        />

        <MeasureField
          id="shape-button"
          label="Radio de botón"
          value={definition.shape.button}
          steps={BUTTON_RADIUS_STEPS}
          advanced={{ validate: isValidLength, placeholder: "ej. 9999px", errorMessage: RADIUS_ERROR }}
          tooltip={<InfoTooltip label="Sobre el radio de botón" content={BUTTON_RADIUS_TOOLTIP} />}
          onChange={(value) =>
            onUpdateDefinition((prev) => ({ ...prev, shape: { ...prev.shape, button: value } }))
          }
        />

        <MeasureField
          id="shape-card"
          label="Radio de tarjeta"
          value={definition.shape.card}
          steps={RADIUS_STEPS}
          advanced={{ validate: isValidLength, placeholder: "ej. 1.5rem", errorMessage: RADIUS_ERROR }}
          tooltip={<InfoTooltip label="Sobre el radio de tarjeta" content={CARD_RADIUS_TOOLTIP} />}
          onChange={(value) =>
            onUpdateDefinition((prev) => ({ ...prev, shape: { ...prev.shape, card: value } }))
          }
        />
      </div>

      <hr className="border-border" />

      <div className="space-y-4">
        <GroupHeading>Densidad</GroupHeading>

        <MeasureField
          id="density-scale"
          label="Densidad"
          value={String(definition.density.scale)}
          steps={DENSITY_STEPS}
          slider={{ min: DENSITY_MIN, max: DENSITY_MAX, step: DENSITY_STEP, format: (value) => Number(value).toFixed(2) }}
          advanced={{
            validate: isValidDensity,
            placeholder: "ej. 1.05",
            errorMessage: `Usa un número entre ${DENSITY_MIN} y ${DENSITY_MAX}.`,
          }}
          tooltip={<InfoTooltip label="Sobre la densidad" content={DENSITY_TOOLTIP} />}
          onChange={(value) =>
            onUpdateDefinition((prev) => ({ ...prev, density: { scale: Number(value) } }))
          }
        />
      </div>

      <hr className="border-border" />

      <div className="space-y-4">
        <GroupHeading>Sombras</GroupHeading>

        <ShadowField
          id="shadow-card"
          label="Sombra de tarjeta"
          value={definition.shadow.card}
          presets={SHADOW_OPTIONS}
          tooltip={<InfoTooltip label="Sobre la sombra de tarjeta" content={SHADOW_CARD_TOOLTIP} />}
          onChange={(value) =>
            onUpdateDefinition((prev) => ({ ...prev, shadow: { ...prev.shadow, card: value } }))
          }
        />

        <ShadowField
          id="shadow-elevated"
          label="Sombra elevada"
          value={definition.shadow.elevated}
          presets={SHADOW_OPTIONS}
          tooltip={<InfoTooltip label="Sobre la sombra elevada" content={SHADOW_ELEVATED_TOOLTIP} />}
          onChange={(value) =>
            onUpdateDefinition((prev) => ({
              ...prev,
              shadow: { ...prev.shadow, elevated: value },
            }))
          }
        />
      </div>
    </div>
  )
}
