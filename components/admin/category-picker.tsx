"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { listActiveStoreCategories } from "@/app/admin/actions/catalog-pickers"
import type { ItemCategory } from "@/lib/types/products"
import { EMPTY_SELECT_VALUE } from "@/lib/ui/select-empty-value"

interface CategoryPickerProps {
  value: string
  onChange: (categoryId: string) => void
  // Lets a caller scope the portaled dropdown to its own chrome (e.g. the
  // neutral theme editor's `.editor-chrome`) without restyling this shared
  // picker for every other caller.
  contentClassName?: string
}

/**
 * Selector de categoría real del catálogo para curar los tiles de "Más
 * vendidos". Lee vía server action para que la tienda salga de la activa del
 * admin (cookie firmada) y no del host, que sería otra tienda cuando el admin
 * entró a una tienda distinta desde el switcher. Mirrors `ProductPicker`'s UX.
 */
export function CategoryPicker({ value, onChange, contentClassName }: CategoryPickerProps) {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true

    listActiveStoreCategories()
      .then((result) => {
        if (active) setCategories(result)
      })
      .catch((error) => {
        console.error("Error fetching categories for picker:", error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const selectedCategory = categories.find((category) => category.id === value)
  const triggerLabel = loading
    ? "Cargando categorías…"
    : selectedCategory
      ? selectedCategory.category_name
      : "Elegí una categoría…"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("editor-chrome w-[--radix-popover-trigger-width] p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder="Buscar por nombre…" />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={EMPTY_SELECT_VALUE}
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                Ninguna (sin categoría)
              </CommandItem>
              {!loading && categories.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No hay categorías
                </div>
              ) : (
                categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.category_name}
                    keywords={[]}
                    onSelect={() => {
                      onChange(category.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{category.category_name}</span>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
