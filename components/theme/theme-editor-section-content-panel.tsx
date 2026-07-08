"use client"

// Renders the content fields for the customizer's section panel, driven
// entirely by the customizer's own ephemeral staging state: no
// admin-context dependency. Reads/writes through the `onFieldChange` seam
// instead of admin-context's schedule/update-edit.

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { ImageUpload } from "@/components/admin/image-upload"
import { ProductPicker } from "@/components/admin/product-picker"
import { CategoryPicker } from "@/components/admin/category-picker"
import { DatetimeLocalInput } from "@/lib/section-editor/datetime-local-input"
import { isToggleOn } from "@/lib/section-editor/toggle-value"
import {
  addArrayItem,
  removeArrayItem,
  updateArrayItem,
} from "@/lib/section-editor/array-field-operations"
import { COMPONENT_FIELDS } from "@/lib/section-editor/component-fields"
import type { SectionArrayField, SectionContentField } from "@/lib/section-editor/types"
import { EMPTY_SELECT_VALUE } from "@/lib/ui/select-empty-value"
import {
  toHeroLayerModel,
  type HeroHotspot,
  type HeroLayerId,
  type HeroSlideUpdateValue,
} from "@/lib/hero/hero-layer-model"
import {
  HeroEditorPanel,
  addHeroSlide,
  createHeroHotspotDraft,
  deleteHeroHotspot,
  deleteHeroSlide,
  getActiveHeroSlideIndex,
  updateHeroHotspot,
  updateHeroSlide,
} from "@/lib/section-editor/hero-editor"
import {
  HeroLayerControls,
  type HeroLayerControlsCallbacks,
} from "@/lib/section-editor/hero-layer-controls"

interface SectionContentPanelProps {
  sectionName: string
  persistedContent: Record<string, any>
  stagedContent: Record<string, any>
  onFieldChange: (key: string, value: any) => void
}

export function SectionContentPanel({
  sectionName,
  persistedContent,
  stagedContent,
  onFieldChange,
}: SectionContentPanelProps) {
  const config = COMPONENT_FIELDS[sectionName]

  if (!config || config.content.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta sección todavía no tiene campos de contenido editables.
      </p>
    )
  }

  const values = { ...config.defaults, ...persistedContent, ...stagedContent }
  // Layout/variant fields (`group: "design"`) render in the Diseño tab
  // instead (via `SectionDesignFieldList`), even though they're staged
  // through this same content path — only real content stays here.
  const contentFields = config.content.filter((field) => field.group !== "design")

  return (
    <div className="space-y-3">
      {sectionName === "hero" ? (
        <HeroContentEditor values={values} defaults={config.defaults} onFieldChange={onFieldChange} />
      ) : (
        <ContentFieldList
          sectionName={sectionName}
          fields={contentFields}
          values={values}
          onFieldChange={onFieldChange}
        />
      )}
    </div>
  )
}

export interface ContentFieldListProps {
  sectionName: string
  fields: SectionContentField[]
  values: Record<string, any>
  onFieldChange: (key: string, value: any) => void
}

/** Shared by the Contenido tab (above) and the Diseño tab's
 * `SectionDesignFieldList` — both map a field list to the same
 * `ContentField`/`ArrayContentField` dispatch, just filtered to a
 * different `group`. */
export function ContentFieldList({ sectionName, fields, values, onFieldChange }: ContentFieldListProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (field.isArray) {
          const items = (values[field.key] as any[]) ?? []
          return (
            <ArrayContentField
              key={field.key}
              field={field}
              items={items}
              sectionName={sectionName}
              onItemChange={(index, subKey, value) =>
                onFieldChange(field.key, updateArrayItem(items, index, subKey, value))
              }
              onAdd={() => onFieldChange(field.key, addArrayItem(items, field.arrayFields ?? []))}
              onRemove={(index) => onFieldChange(field.key, removeArrayItem(items, index))}
            />
          )
        }

        return (
          <ContentField
            key={field.key}
            field={field}
            value={values[field.key]}
            fieldId={`section-content-${sectionName}-${field.key}`}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        )
      })}
    </div>
  )
}

interface ContentFieldProps {
  field: SectionArrayField | SectionContentField
  value: any
  fieldId: string
  onChange: (value: any) => void
}

interface FieldShellProps {
  fieldId: string
  label: string
  children: ReactNode
}

/** Label + spacing wrapper shared by every field control below (except the
 * image control, which renders its own label via `ImageUpload`). */
function FieldShell({ fieldId, label, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      {children}
    </div>
  )
}

function ContentField({ field, value, fieldId, onChange }: ContentFieldProps) {
  if (field.type === "select" && field.options) {
    const rawValue = value ?? ""
    return (
      <FieldShell fieldId={fieldId} label={field.label}>
        <Select
          value={rawValue === "" ? EMPTY_SELECT_VALUE : rawValue}
          onValueChange={(next) => onChange(next === EMPTY_SELECT_VALUE ? "" : next)}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="editor-chrome">
            {field.options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value === "" ? EMPTY_SELECT_VALUE : option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>
    )
  }

  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={fieldId}>{field.label}</Label>
        <Switch id={fieldId} checked={isToggleOn(value)} onCheckedChange={onChange} />
      </div>
    )
  }

  if (field.type === "product") {
    return (
      <FieldShell fieldId={fieldId} label={field.label}>
        <ProductPicker value={value ?? ""} onChange={onChange} contentClassName="editor-chrome" />
      </FieldShell>
    )
  }

  if (field.type === "category") {
    return (
      <FieldShell fieldId={fieldId} label={field.label}>
        <CategoryPicker value={value ?? ""} onChange={onChange} contentClassName="editor-chrome" />
      </FieldShell>
    )
  }

  if (field.type === "datetime") {
    return (
      <FieldShell fieldId={fieldId} label={field.label}>
        <DatetimeLocalInput id={fieldId} value={value ?? ""} onChange={onChange} />
      </FieldShell>
    )
  }

  if (field.type === "image") {
    return <ImageUpload value={value ?? ""} onChange={onChange} label={field.label} context={fieldId} />
  }

  if (field.type === "textarea") {
    return (
      <FieldShell fieldId={fieldId} label={field.label}>
        <Textarea id={fieldId} value={value ?? ""} onChange={(event) => onChange(event.target.value)} rows={3} />
      </FieldShell>
    )
  }

  return (
    <FieldShell fieldId={fieldId} label={field.label}>
      <Input
        id={fieldId}
        type={field.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(event) =>
          onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
        }
      />
    </FieldShell>
  )
}

interface ArrayContentFieldProps {
  field: SectionContentField
  items: any[]
  sectionName: string
  onItemChange: (index: number, subKey: string, value: any) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

function ArrayContentField({ field, items, sectionName, onItemChange, onAdd, onRemove }: ArrayContentFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-semibold">{field.label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          Agregar
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {(field.arrayFields ?? []).map((subField) => (
              <ContentField
                key={subField.key}
                field={subField}
                value={item[subField.key]}
                fieldId={`section-content-${sectionName}-${field.key}-${index}-${subField.key}`}
                onChange={(value) => onItemChange(index, subField.key, value)}
              />
            ))}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No hay items. Usa Agregar para crear uno.
          </p>
        )}
      </div>
    </div>
  )
}

interface HeroContentEditorProps {
  values: Record<string, any>
  defaults?: Record<string, any>
  onFieldChange: (key: string, value: any) => void
}

function HeroContentEditor({ values, defaults, onFieldChange }: HeroContentEditorProps) {
  const [activeHeroLayer, setActiveHeroLayer] = useState<HeroLayerId>("background")
  const [selectedHeroSlideIndex, setSelectedHeroSlideIndex] = useState(0)
  const [selectedHeroHotspotId, setSelectedHeroHotspotId] = useState<string | null>(null)

  const heroLayerModel = toHeroLayerModel(values)
  const activeHeroSlideIndex = getActiveHeroSlideIndex(heroLayerModel.products, selectedHeroSlideIndex)
  const activeHeroSlide = heroLayerModel.products[activeHeroSlideIndex] ?? {}

  const handleHeroSlideChange = (
    fieldKey: string,
    value: HeroSlideUpdateValue,
    extraUpdates: Record<string, HeroSlideUpdateValue> = {},
  ) => {
    const updatedProducts = updateHeroSlide(heroLayerModel.products, activeHeroSlideIndex, {
      [fieldKey]: value,
      ...extraUpdates,
    })
    onFieldChange("products", updatedProducts)
  }

  const handleAddHeroSlide = () => {
    const result = addHeroSlide(heroLayerModel.products)
    onFieldChange("products", result.products)
    setSelectedHeroSlideIndex(result.nextSlideIndex)
    setSelectedHeroHotspotId(result.nextHotspotId)
  }

  const handleDeleteHeroSlide = () => {
    if (heroLayerModel.products.length <= 1) return
    const result = deleteHeroSlide(heroLayerModel.products, activeHeroSlideIndex)
    onFieldChange("products", result.products)
    setSelectedHeroSlideIndex(result.nextSlideIndex)
    setSelectedHeroHotspotId(result.nextHotspotId)
  }

  const handleAddHeroHotspot = () => {
    if (!activeHeroSlide.productImage) return
    const activeHotspots = activeHeroSlide.hotspots ?? []
    const nextHotspot = createHeroHotspotDraft(activeHotspots)
    handleHeroSlideChange("hotspots", [...activeHotspots, nextHotspot])
    setSelectedHeroHotspotId(nextHotspot.id)
  }

  const handleHeroHotspotChange = (hotspotId: string, updates: Partial<HeroHotspot>) => {
    handleHeroSlideChange("hotspots", updateHeroHotspot(activeHeroSlide.hotspots ?? [], hotspotId, updates))
  }

  const handleDeleteHeroHotspot = (hotspotId: string) => {
    handleHeroSlideChange("hotspots", deleteHeroHotspot(activeHeroSlide.hotspots ?? [], hotspotId))
    if (selectedHeroHotspotId === hotspotId) setSelectedHeroHotspotId(null)
  }

  const callbacks: HeroLayerControlsCallbacks = {
    onFieldChange,
    onSlideChange: handleHeroSlideChange,
    onAddHotspot: handleAddHeroHotspot,
    onHotspotChange: handleHeroHotspotChange,
    onDeleteHotspot: handleDeleteHeroHotspot,
    onSelectHotspot: setSelectedHeroHotspotId,
  }

  return (
    <HeroEditorPanel
      heroLayerModel={heroLayerModel}
      activeHeroSlideIndex={activeHeroSlideIndex}
      activeHeroLayer={activeHeroLayer}
      onLayoutModeChange={(value) => onFieldChange("layoutMode", value)}
      onAddSlide={handleAddHeroSlide}
      onDeleteSlide={handleDeleteHeroSlide}
      onSelectSlide={(index) => {
        setSelectedHeroSlideIndex(index)
        setSelectedHeroHotspotId(null)
      }}
      onSelectLayer={setActiveHeroLayer}
    >
      <HeroLayerControls
        heroLayerModel={heroLayerModel}
        activeHeroLayer={activeHeroLayer}
        activeHeroSlide={activeHeroSlide}
        selectedHeroHotspotId={selectedHeroHotspotId}
        fallbackTextColor={values.textColor}
        currentButtonColor={values.buttonColor}
        fallbackButtonColor={defaults?.buttonColor}
        callbacks={callbacks}
      />
    </HeroEditorPanel>
  )
}
