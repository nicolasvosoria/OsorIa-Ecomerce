import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ColorField } from "@/components/theme/theme-editor-fields"
import { InfoTooltip } from "@/components/theme/info-tooltip"
import {
  SECTION_COLOR_KEY_LABELS,
  humanizeCamelCase,
} from "@/components/theme/theme-editor-sections-tab"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PRODUCTS_RADIUS_CLASS,
  SECTION_FIELD_THEME_TOKEN,
  SECTION_STYLE_KEYS,
  sectionDefinitionKey,
} from "@/lib/theme/section-style-keys"
import type { ThemeColors, ThemeDefinition } from "@/lib/types/theme"

type DefinitionUpdater = (prev: ThemeDefinition) => ThemeDefinition

interface SectionDesignPanelProps {
  sectionName: string
  sections: ThemeDefinition["sections"]
  onUpdateDefinition: (updater: DefinitionUpdater) => void
  themeColors: ThemeColors
}

// The one non-color design key today (`cornerRadius`): a closed set of
// Tailwind radius presets rather than a free color value, so it renders as a
// select instead of a `ColorField`.
const CORNER_RADIUS_STYLE_KEY = "cornerRadius"

const RADIUS_OPTION_LABELS: Record<string, string> = {
  none: "Ninguno",
  md: "Mediano",
  lg: "Grande",
  xl: "Extra grande",
}

function fieldLabel(definitionKey: string, isInherited: boolean): string {
  const baseLabel = SECTION_COLOR_KEY_LABELS[definitionKey] ?? humanizeCamelCase(definitionKey)
  return isInherited ? `${baseLabel} · Del diseño general` : baseLabel
}

const SECTION_SCOPE_NOTE = "Solo afecta esta sección; el resto del sitio sigue usando el valor del diseño general."

function sectionColorTooltip(baseLabel: string): string {
  return `Anula el color "${baseLabel}" del diseño general para esta sección. ${SECTION_SCOPE_NOTE}`
}

const CORNER_RADIUS_TOOLTIP = `Anula el redondeo de esquinas del diseño general para esta sección. ${SECTION_SCOPE_NOTE}`

export function SectionDesignPanel({
  sectionName,
  sections,
  onUpdateDefinition,
  themeColors,
}: SectionDesignPanelProps) {
  const styleKeys = SECTION_STYLE_KEYS[sectionName] ?? []
  const sectionOverrides = sections?.[sectionName] ?? {}
  const hasOverride = styleKeys.some((styleKey) => {
    const value = sectionOverrides[sectionDefinitionKey(styleKey)]
    return value !== undefined && value !== ""
  })

  function writeField(definitionKey: string, value: string) {
    onUpdateDefinition((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: { ...prev.sections?.[sectionName], [definitionKey]: value },
      },
    }))
  }

  function resetToTheme() {
    onUpdateDefinition((prev) => {
      if (!prev.sections?.[sectionName]) return prev
      const nextSections = { ...prev.sections }
      delete nextSections[sectionName]
      return { ...prev, sections: nextSections }
    })
  }

  if (styleKeys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta sección todavía no tiene campos de diseño editables.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Diseño</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto shrink-0 p-0 text-xs font-normal"
          disabled={!hasOverride}
          onClick={resetToTheme}
          title="Quita las personalizaciones de esta sección y vuelve a usar los colores del diseño general."
        >
          Restablecer
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Personaliza el diseño solo de esta sección. Cada campo usa el color del diseño general hasta que lo cambies.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {styleKeys.map((styleKey) => {
          const definitionKey = sectionDefinitionKey(styleKey)
          const value = sectionOverrides[definitionKey] ?? ""

          const label = fieldLabel(definitionKey, value === "")

          if (styleKey === CORNER_RADIUS_STYLE_KEY) {
            return (
              <RadiusField
                key={styleKey}
                id={`section-design-${sectionName}-${styleKey}`}
                label={label}
                value={value}
                tooltip={<InfoTooltip label={`Sobre ${label.toLowerCase()}`} content={CORNER_RADIUS_TOOLTIP} />}
                onChange={(next) => writeField(definitionKey, next)}
              />
            )
          }

          const themeToken = SECTION_FIELD_THEME_TOKEN[sectionName]?.[definitionKey]
          const inheritedColor = themeToken ? themeColors[themeToken] : undefined

          return (
            <ColorField
              key={styleKey}
              id={`section-design-${sectionName}-${styleKey}`}
              label={label}
              value={value}
              inheritedColor={inheritedColor}
              tooltip={<InfoTooltip label={`Sobre ${label.toLowerCase()}`} content={sectionColorTooltip(label)} />}
              onChange={(next) => writeField(definitionKey, next)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface RadiusFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  tooltip?: ReactNode
}

function RadiusField({ id, label, value, onChange, tooltip }: RadiusFieldProps) {
  return (
    <div className="col-span-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        {tooltip}
      </div>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} size="sm" className="w-full">
          <SelectValue placeholder="Usa el valor del diseño general" />
        </SelectTrigger>
        <SelectContent className="editor-chrome">
          {Object.keys(PRODUCTS_RADIUS_CLASS).map((radiusKey) => (
            <SelectItem key={radiusKey} value={radiusKey}>
              {RADIUS_OPTION_LABELS[radiusKey] ?? radiusKey}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
