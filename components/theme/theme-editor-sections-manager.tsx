"use client"

// Secciones tab: lists the home's composable sections and lets the admin
// reorder (drag), hide/show, and remove them from `workingComposition`. All
// mutations flow back through the callbacks the host (`ThemeCustomEditor`)
// passes down — this component holds no persistence logic of its own.

import { useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { HomeSectionEntry } from "@/lib/supabase/types"
import { COMPOSABLE_SECTION_KEYS } from "@/lib/sections/home-composition"
import { sectionLabel } from "@/lib/section-editor/sections-registry"

interface SectionsManagerProps {
  entries: HomeSectionEntry[]
  onReorder: (activeKey: string, overKey: string) => void
  onToggle: (key: string) => void
  onRemove: (key: string) => void
  onAdd: (key: string) => void
}

export function SectionsManager({ entries, onReorder, onToggle, onRemove, onAdd }: SectionsManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onReorder(String(active.id), String(over.id))
  }

  // Sections not currently in the composition (e.g. previously removed) —
  // the only ones "Agregar sección" can offer, so re-adding can never
  // duplicate an entry already in the list.
  const addableKeys = COMPOSABLE_SECTION_KEYS.filter(
    (key) => !entries.some((entry) => entry.key === key),
  )

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Secciones del inicio</h3>
        <AddSectionControl addableKeys={addableKeys} onAdd={onAdd} />
      </div>

      {entries.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No quedan secciones en el inicio. Usa &quot;Agregar sección&quot; para volver a mostrarlas.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map((entry) => entry.key)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {entries.map((entry) => (
                <SectionRow key={entry.key} entry={entry} onToggle={onToggle} onRemove={onRemove} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

interface AddSectionControlProps {
  addableKeys: string[]
  onAdd: (key: string) => void
}

// "Agregar sección" palette: lists composable sections missing from the
// current composition (typically ones the admin removed earlier). Disabled
// once every composable section is already present — there's nothing left
// to offer.
function AddSectionControl({ addableKeys, onAdd }: AddSectionControlProps) {
  const [open, setOpen] = useState(false)
  const hasAddable = addableKeys.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!hasAddable}
          title={hasAddable ? undefined : "Todas las secciones ya están en tu inicio"}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar sección
        </Button>
      </PopoverTrigger>
      <PopoverContent className="editor-chrome w-56 p-1" align="end">
        <ul className="space-y-0.5">
          {addableKeys.map((key) => (
            <li key={key}>
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onAdd(key)
                  setOpen(false)
                }}
              >
                {sectionLabel(key)}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

interface SectionRowProps {
  entry: HomeSectionEntry
  onToggle: (key: string) => void
  onRemove: (key: string) => void
}

function SectionRow({ entry, onToggle, onRemove }: SectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li ref={setNodeRef} style={style}>
      <Card className={`flex items-center gap-2 p-2 ${isDragging ? "opacity-70" : ""}`}>
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Reordenar ${sectionLabel(entry.key)}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <span className="flex-1 truncate text-sm">{sectionLabel(entry.key)}</span>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onToggle(entry.key)}
          title={entry.enabled ? "Ocultar" : "Mostrar"}
          aria-label={entry.enabled ? "Ocultar sección" : "Mostrar sección"}
        >
          {entry.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(entry.key)}
          title="Quitar"
          aria-label="Quitar sección"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </Card>
    </li>
  )
}
