import { Check } from "lucide-react"
import type { AppFontPairing } from "@/lib/types/font"
import { InfoTooltip } from "@/components/theme/info-tooltip"

interface FuentesTabProps {
  pairings: AppFontPairing[]
  selectedPairingId: number | null
  onSelectPairing: (pairing: AppFontPairing | null) => void
}

const PAIRING_TOOLTIP =
  "Cada combinación fija la fuente de títulos y de texto. Afecta todo el sitio."

export function FuentesTab({ pairings, selectedPairingId, onSelectPairing }: FuentesTabProps) {
  if (pairings.length === 0) {
    return (
      <p className="pt-3 text-sm text-muted-foreground">
        No hay combinaciones de fuentes disponibles.
      </p>
    )
  }

  return (
    <div className="space-y-2 pt-3">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium">Combinación de fuentes</p>
        <InfoTooltip label="Sobre las combinaciones de fuentes" content={PAIRING_TOOLTIP} />
      </div>
      <PairingRow
        label="Predeterminada"
        description="Fuentes del sistema"
        selected={selectedPairingId === null}
        onSelect={() => onSelectPairing(null)}
      />
      {pairings.map((pairing) => (
        <PairingRow
          key={pairing.id}
          label={pairing.pairing_name}
          description={`${pairing.heading_font_name} · ${pairing.body_font_name}`}
          selected={selectedPairingId === pairing.id}
          onSelect={() => onSelectPairing(pairing)}
        />
      ))}
    </div>
  )
}

interface PairingRowProps {
  label: string
  description: string
  selected: boolean
  onSelect: () => void
}

function PairingRow({ label, description, selected, onSelect }: PairingRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  )
}
