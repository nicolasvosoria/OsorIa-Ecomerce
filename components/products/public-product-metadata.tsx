import type { ReactNode } from 'react'

import { translations } from '@/lib/i18n/translations'

// Storefront components have no runtime language switch here and this one renders
// from a server component, so useLanguage()'s provider is not reachable; a static
// read (matching how the admin's ShippingCard reads translations.es.products) keeps
// the new "Peso" label going through translations.ts without a hook dependency.
const copy = translations.es.products

type PublicMetadataField = {
  key: string
  label: string
}

export type PublicProductMetadataEntry = PublicMetadataField & {
  value: string
}

const PUBLIC_PRODUCT_METADATA_FIELDS: PublicMetadataField[] = [
  { key: 'brand', label: 'Marca' },
  { key: 'model', label: 'Modelo' },
  { key: 'material', label: 'Material' },
  { key: 'materials', label: 'Materiales' },
  { key: 'color', label: 'Color' },
  { key: 'dimensions', label: 'Dimensiones' },
  // weight was absorbed by the real weight_grams column; see withPublicWeight below.
  { key: 'warranty', label: 'Garantía' },
  { key: 'compatibility', label: 'Compatibilidad' },
  { key: 'power', label: 'Potencia' },
  { key: 'capacity', label: 'Capacidad' },
  { key: 'connectivity', label: 'Conectividad' },
]

function isMetadataRecord(metadata: unknown): metadata is Record<string, unknown> {
  return Boolean(metadata) && typeof metadata === 'object' && !Array.isArray(metadata)
}

function formatPublicMetadataValue(value: unknown): string | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const values = value
      .map((entry) => formatPublicMetadataValue(entry))
      .filter((entry): entry is string => Boolean(entry))
    return values.length > 0 ? values.join(', ') : null
  }

  return null
}

export function getPublicProductMetadata(metadata: unknown): PublicProductMetadataEntry[] {
  if (!isMetadataRecord(metadata)) return []

  return PUBLIC_PRODUCT_METADATA_FIELDS.flatMap((field) => {
    const value = formatPublicMetadataValue(metadata[field.key])
    return value ? [{ ...field, value }] : []
  })
}

// weight_grams is a real column now, not free text, so it never comes through
// getPublicProductMetadata; it is spliced back in right after Dimensiones,
// the spot "Peso" held before it was absorbed -- but only when the product
// actually carries a Dimensiones entry. Most products don't, so weight lands
// at the end of the list instead (after whichever fields the product has).
function withPublicWeight(
  entries: PublicProductMetadataEntry[],
  weightGrams: number | null | undefined,
): PublicProductMetadataEntry[] {
  if (weightGrams == null) return entries

  const weightEntry: PublicProductMetadataEntry = {
    key: 'weight',
    label: copy.weightPublicLabel,
    value: formatPublicWeightGrams(weightGrams),
  }
  const dimensionsIndex = entries.findIndex((entry) => entry.key === 'dimensions')
  const insertAt = dimensionsIndex === -1 ? entries.length : dimensionsIndex + 1

  return [...entries.slice(0, insertAt), weightEntry, ...entries.slice(insertAt)]
}

// Grams read best under 1kg; kilograms (two decimals, trimmed) read best at or above
// it. Presentation only -- the stored value stays integer grams (Amendment A4).
function formatPublicWeightGrams(grams: number): string {
  if (grams >= 1000) {
    const kilograms = Math.round((grams / 1000) * 100) / 100
    return `${kilograms} kg`
  }
  return `${grams} g`
}

export function PublicProductMetadata({
  metadata,
  weightGrams,
}: {
  metadata: unknown
  weightGrams?: number | null
}): ReactNode {
  const entries = withPublicWeight(getPublicProductMetadata(metadata), weightGrams)

  if (entries.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Especificaciones</h4>
      <dl className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.key} className="flex justify-between">
            <dt className="text-sm text-muted-foreground">{entry.label}:</dt>
            <dd className="text-sm font-medium">{entry.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
