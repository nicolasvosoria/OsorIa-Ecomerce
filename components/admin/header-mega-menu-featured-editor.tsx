"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { ProductPicker } from "@/components/admin/product-picker"

interface Category {
  id: string
  category_name: string
}

interface HeaderMegaMenuFeaturedEditorProps {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
}

/**
 * Per-category override for the header mega-menu's featured product. Lists
 * the store's current categories (loaded dynamically, same as the live
 * header) and lets the admin pin a specific product per category instead of
 * relying on `resolveFeaturedProductId`'s auto-derivation.
 */
export function HeaderMegaMenuFeaturedEditor({ value, onChange }: HeaderMegaMenuFeaturedEditorProps) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    let active = true

    fetch("/api/categories")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Category[]) => {
        if (active) setCategories(data)
      })
      .catch((error) => {
        console.error("Error loading categories for the header featured-product editor:", error)
      })

    return () => {
      active = false
    }
  }, [])

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <Label className="font-semibold">Producto destacado por categoría</Label>
      <p className="text-xs text-muted-foreground">
        Opcional: elegí un producto puntual para el panel destacado del menú de cada
        categoría. Si no elegís ninguno, se usa automáticamente el producto destacado
        de la categoría (o el primero, si ninguno está marcado).
      </p>
      {categories.map((category) => (
        <div key={category.id} className="space-y-1">
          <Label className="text-xs">{category.category_name}</Label>
          <ProductPicker
            value={value[category.id] || ""}
            onChange={(productId) => onChange({ ...value, [category.id]: productId })}
          />
        </div>
      ))}
    </div>
  )
}
