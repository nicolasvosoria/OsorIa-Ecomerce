import type { ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ColorField } from "@/components/theme/theme-editor-fields"
import { InfoTooltip } from "@/components/theme/info-tooltip"
import {
  SECTION_COLOR_KEY_LABELS,
  humanizeCamelCase,
} from "@/components/theme/theme-editor-sections-tab"
import { ContentFieldList } from "@/components/theme/theme-editor-section-content-panel"
import { COMPONENT_FIELDS } from "@/lib/section-editor/component-fields"
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

  function writeField(definitionKey: string, value: string) {
    onUpdateDefinition((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: { ...prev.sections?.[sectionName], [definitionKey]: value },
      },
    }))
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

interface SectionDesignResetActionProps {
  sectionName: string
  sections: ThemeDefinition["sections"]
  onUpdateDefinition: (updater: DefinitionUpdater) => void
}

/**
 * The "Restablecer" control for a section's theme-override design fields
 * (the colors/corner-radius overrides in `ThemeDefinition.sections[sectionName]`
 * that `SectionDesignPanel` above renders). Split out so the caller can place
 * it AFTER `SectionDesignFieldList`'s layout/variant fields — the user wants
 * Restablecer as the bottom-most control of the Diseño tab, not sandwiched
 * between the colors block and the layout options. Resets only the theme
 * override for this section; layout/variant content fields (design-group,
 * staged through `onContentFieldChange`) are untouched.
 */
export function SectionDesignResetAction({
  sectionName,
  sections,
  onUpdateDefinition,
}: SectionDesignResetActionProps) {
  const styleKeys = SECTION_STYLE_KEYS[sectionName] ?? []
  if (styleKeys.length === 0) return null

  const sectionOverrides = sections?.[sectionName] ?? {}
  const hasOverride = styleKeys.some((styleKey) => {
    const value = sectionOverrides[sectionDefinitionKey(styleKey)]
    return value !== undefined && value !== ""
  })

  function resetToTheme() {
    onUpdateDefinition((prev) => {
      if (!prev.sections?.[sectionName]) return prev
      const nextSections = { ...prev.sections }
      delete nextSections[sectionName]
      return { ...prev, sections: nextSections }
    })
  }

  return (
    <div className="mt-6 flex justify-end border-t pt-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasOverride}
            title="Quita las personalizaciones de esta sección y vuelve a usar los colores del diseño general."
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="editor-chrome">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer el diseño de esta sección?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderán los cambios de diseño hechos solo para esta sección y volverá a usar el diseño general.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetToTheme}>Restablecer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface SectionDesignFieldListProps {
  sectionName: string
  persistedContent: Record<string, any>
  stagedContent: Record<string, any>
  onContentFieldChange: (key: string, value: any) => void
}

/**
 * The layout/variant fields declared `group: "design"` in
 * `component-fields.ts` (e.g. products' `columns`/`cardStyle`, popular's
 * `tileAspect`) — real CONTENT fields that render in the Diseño tab instead
 * of Contenido. Staged through the same content path as Contenido
 * (`onContentFieldChange` -> `workingContent` -> preview -> persisted on
 * Apply), never through `onUpdateDefinition`/`ThemeDefinition.sections`, so
 * applying a theme never resets them. Renders nothing once a section has no
 * design-group fields.
 */
export function SectionDesignFieldList({
  sectionName,
  persistedContent,
  stagedContent,
  onContentFieldChange,
}: SectionDesignFieldListProps) {
  const config = COMPONENT_FIELDS[sectionName]
  const designFields = config?.content.filter((field) => field.group === "design") ?? []

  if (designFields.length === 0) return null

  const values = { ...config?.defaults, ...persistedContent, ...stagedContent }

  return (
    <div className="mt-6 space-y-3 border-t pt-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Opciones de sección</p>
      <ContentFieldList
        sectionName={sectionName}
        fields={designFields}
        values={values}
        onFieldChange={onContentFieldChange}
      />
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
