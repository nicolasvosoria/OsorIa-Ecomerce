import type { ReactNode } from 'react'

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
  { key: 'weight', label: 'Peso' },
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

export function PublicProductMetadata({ metadata }: { metadata: unknown }): ReactNode {
  const publicMetadata = getPublicProductMetadata(metadata)

  if (publicMetadata.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Especificaciones</h4>
      <dl className="space-y-2">
        {publicMetadata.map((entry) => (
          <div key={entry.key} className="flex justify-between">
            <dt className="text-sm text-muted-foreground">{entry.label}:</dt>
            <dd className="text-sm font-medium">{entry.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
