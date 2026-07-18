"use client"

import { sortOptions } from "@/lib/commerce/constants"
import type { ShopConfig, ShopFilterKey, ShopSort } from "@/lib/shop/shop-config"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EMPTY_SELECT_VALUE } from "@/lib/ui/select-empty-value"

// The relevance order (D20) is `defaultSort: null` — not one of `sortOptions`,
// so the select carries it as its own first entry (the Radix-reserved
// EMPTY_SELECT_VALUE sentinel) and maps back to null on change.
const RELEVANCE_SORT_LABEL = "Relevancia (por defecto)"

const FILTER_TOGGLES: { key: ShopFilterKey; label: string }[] = [
  { key: "category", label: "Categoría" },
  { key: "color", label: "Color" },
  { key: "tipo", label: "Tipo" },
  { key: "sort", label: "Ordenar" },
  { key: "price", label: "Precio" },
  { key: "enOferta", label: "En oferta" },
]

const COPY_FIELDS: { key: "title" | "subtitle"; label: string }[] = [
  { key: "title", label: "Título" },
  { key: "subtitle", label: "Subtítulo" },
]

interface ShopCopy {
  title?: string
  subtitle?: string
}

interface ThemeEditorShopTabProps {
  config: ShopConfig
  onUpdateConfig: (updater: (prev: ShopConfig) => ShopConfig) => void
  copy: ShopCopy
  onCopyChange: (key: "title" | "subtitle", value: string) => void
}

export function ThemeEditorShopTab({ config, onUpdateConfig, copy, onCopyChange }: ThemeEditorShopTabProps) {
  return (
    <div className="space-y-6 pt-3">
      <DefaultSortField
        sort={config.defaultSort}
        onChange={(sort) => onUpdateConfig((prev) => ({ ...prev, defaultSort: sort }))}
      />
      <FilterVisibilityFields
        filters={config.filters}
        onToggle={(key, visible) =>
          onUpdateConfig((prev) => ({ ...prev, filters: { ...prev.filters, [key]: visible } }))
        }
      />
      <ShopCopyFields copy={copy} onCopyChange={onCopyChange} />
    </div>
  )
}

interface DefaultSortFieldProps {
  sort: ShopSort | null
  onChange: (sort: ShopSort | null) => void
}

function DefaultSortField({ sort, onChange }: DefaultSortFieldProps) {
  return (
    <FieldGroup fieldId="shop-default-sort" label="Orden por defecto">
      <Select
        value={sort ?? EMPTY_SELECT_VALUE}
        onValueChange={(value) => onChange(value === EMPTY_SELECT_VALUE ? null : (value as ShopSort))}
      >
        <SelectTrigger id="shop-default-sort" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="editor-chrome">
          <SelectItem value={EMPTY_SELECT_VALUE}>{RELEVANCE_SORT_LABEL}</SelectItem>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldGroup>
  )
}

interface FilterVisibilityFieldsProps {
  filters: ShopConfig["filters"]
  onToggle: (key: ShopFilterKey, visible: boolean) => void
}

function FilterVisibilityFields({ filters, onToggle }: FilterVisibilityFieldsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Filtros visibles</p>
      <div className="space-y-2.5">
        {FILTER_TOGGLES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`shop-filter-${key}`}>{label}</Label>
            <Switch
              id={`shop-filter-${key}`}
              checked={filters[key]}
              onCheckedChange={(checked) => onToggle(key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface ShopCopyFieldsProps {
  copy: ShopCopy
  onCopyChange: (key: "title" | "subtitle", value: string) => void
}

function ShopCopyFields({ copy, onCopyChange }: ShopCopyFieldsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Encabezado de la tienda</p>
      {COPY_FIELDS.map(({ key, label }) => (
        <FieldGroup key={key} fieldId={`shop-copy-${key}`} label={label}>
          <Input
            id={`shop-copy-${key}`}
            value={copy[key] ?? ""}
            onChange={(event) => onCopyChange(key, event.target.value)}
          />
        </FieldGroup>
      ))}
    </div>
  )
}

interface FieldGroupProps {
  fieldId: string
  label: string
  children: React.ReactNode
}

function FieldGroup({ fieldId, label, children }: FieldGroupProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      {children}
    </div>
  )
}
