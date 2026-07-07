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
import { getItems } from "@/lib/supabase/products-api"
import type { StoreItemWithDetails } from "@/lib/types/products"
import { EMPTY_SELECT_VALUE } from "@/lib/ui/select-empty-value"

interface ProductPickerProps {
  value: string
  onChange: (productId: string) => void
  // Lets a caller scope the portaled dropdown to its own chrome (e.g. the
  // neutral theme editor's `.editor-chrome`) without restyling this shared
  // picker for every other caller.
  contentClassName?: string
}

/**
 * Selector de producto real del catálogo para hidratar secciones destacadas.
 * Usa `getItems`, la misma fuente que el resto del storefront, así el preview
 * del editor queda sincronizado con el live. No filtramos por UUID (ilegible
 * para el admin); para sumar otro criterio de filtrado a futuro, usar la prop
 * `keywords` de cada CommandItem.
 */
export function ProductPicker({ value, onChange, contentClassName }: ProductPickerProps) {
  const [items, setItems] = useState<StoreItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true

    getItems({
      is_active: true,
      limit: 100,
      order_by: "item_name",
      order_direction: "asc",
    })
      .then((result) => {
        if (active) setItems(result.items)
      })
      .catch((error) => {
        console.error("Error fetching products for picker:", error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const selectedItem = items.find((item) => item.id === value)
  const triggerLabel = loading
    ? "Cargando productos…"
    : selectedItem
      ? selectedItem.item_name
      : "Elegí un producto…"

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
                <Check
                  className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")}
                />
                Ninguno (sin producto)
              </CommandItem>
              {!loading && items.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No hay productos
                </div>
              ) : (
                items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.item_name}
                    keywords={[]}
                    onSelect={() => {
                      onChange(item.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{item.item_name}</span>
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
