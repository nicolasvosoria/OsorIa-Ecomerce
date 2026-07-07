import { Button } from "@/components/ui/button"
import type { ThemeColors, ThemeMode } from "@/lib/types/theme"
import { ColorField } from "@/components/theme/theme-editor-fields"
import { InfoTooltip } from "@/components/theme/info-tooltip"
import { computeAutoForeground } from "@/lib/theme-font/contrast"

interface ColorFieldSpec {
  key: keyof ThemeColors
  label: string
  tooltip?: string
}

interface ForegroundFieldSpec {
  key: keyof ThemeColors
  label: string
  /** The background color this foreground is read against for contrast. */
  backgroundKey: keyof ThemeColors
}

const BASE_COLOR_FIELDS: readonly ColorFieldSpec[] = [
  {
    key: "primary",
    label: "Primario",
    tooltip: "Color principal de marca: botones, enlaces y acentos destacados. Afecta todo el sitio.",
  },
  { key: "secondary", label: "Secundario" },
  {
    key: "accent",
    label: "Acento",
    tooltip: "Color de énfasis para resaltar elementos puntuales. Afecta todo el sitio.",
  },
  { key: "background", label: "Fondo" },
  { key: "card", label: "Tarjeta" },
  { key: "border", label: "Borde" },
  {
    key: "muted",
    label: "Atenuado",
    tooltip: "Fondo para elementos secundarios y menos prominentes. Afecta todo el sitio.",
  },
]

const FOREGROUND_COLOR_FIELDS: readonly ForegroundFieldSpec[] = [
  { key: "foreground", label: "Texto", backgroundKey: "background" },
  { key: "cardForeground", label: "Texto de tarjeta", backgroundKey: "card" },
  { key: "mutedForeground", label: "Texto atenuado", backgroundKey: "muted" },
]

const CONTRAST_NOTE = "Automático por defecto: se ajusta para buen contraste. Personalízalo si quieres un color exacto."

// Shared across this tab's own tooltip and the Stage preview-mode label
// (theme-custom-editor.tsx) — a single source for the claro/oscuro copy.
export const COLOR_SET_LABELS: Record<ThemeMode, string> = { light: "claro", dark: "oscuro" }

interface ColoresTabProps {
  colors: ThemeColors
  editingColorSet: ThemeMode
  onEditingColorSetChange: (mode: ThemeMode) => void
  onColorChange: (key: keyof ThemeColors, value: string) => void
}

export function ColoresTab({
  colors,
  editingColorSet,
  onEditingColorSetChange,
  onColorChange,
}: ColoresTabProps) {
  const editingColorSetTooltip = `Editas el conjunto de colores ${COLOR_SET_LABELS[editingColorSet]}. La forma, las fuentes y las secciones se comparten entre ambos modos.`

  return (
    <div className="space-y-5 pt-3">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">Colores</span>
        <InfoTooltip label="Sobre el set de colores" content={editingColorSetTooltip} />
      </div>
      <div
        className="flex items-center gap-1 rounded-md border bg-background p-1"
        role="group"
        aria-label="Set de colores a editar"
      >
        <Button
          type="button"
          variant={editingColorSet === "light" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          aria-pressed={editingColorSet === "light"}
          onClick={() => onEditingColorSetChange("light")}
        >
          Claro
        </Button>
        <Button
          type="button"
          variant={editingColorSet === "dark" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          aria-pressed={editingColorSet === "dark"}
          onClick={() => onEditingColorSetChange("dark")}
        >
          Oscuro
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BASE_COLOR_FIELDS.map(({ key, label, tooltip }) => (
          <ColorField
            key={key}
            id={`color-${key}`}
            label={label}
            value={colors[key]}
            tooltip={tooltip && <InfoTooltip label={`Sobre el color ${label.toLowerCase()}`} content={tooltip} />}
            onChange={(value) => onColorChange(key, value)}
          />
        ))}
      </div>

      <hr className="border-border" />

      <details className="text-xs">
        <summary className="flex cursor-pointer select-none items-center gap-1 text-muted-foreground [&::-webkit-details-marker]:hidden marker:content-none">
          <span aria-hidden>▸</span> Personalizar color de texto
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">{CONTRAST_NOTE}</p>
          <div className="grid grid-cols-2 gap-3">
            {FOREGROUND_COLOR_FIELDS.map(({ key, label, backgroundKey }) => (
              <div key={key} className="space-y-1">
                <ColorField
                  id={`color-${key}`}
                  label={label}
                  value={colors[key]}
                  onChange={(value) => onColorChange(key, value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-muted-foreground"
                  onClick={() => onColorChange(key, computeAutoForeground(colors[backgroundKey]))}
                >
                  Automático
                </Button>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
}
