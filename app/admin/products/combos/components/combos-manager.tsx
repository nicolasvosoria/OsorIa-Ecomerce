"use client"

import { useState } from "react"

import type { DataTableState } from "@/components/admin/data-table"
import type { ComboCatalogDetails } from "@/lib/combos/types"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"
import { ComboForm } from "./combo-form"
import { CombosTable } from "./combos-table"

type CombosManagerProps = {
  combos: ComboCatalogDetails[]
  state: DataTableState
  products: StoreItemWithDetails[]
  categories: ItemCategory[]
}

export function CombosManager({ combos, state, products, categories }: CombosManagerProps) {
  const [editingCombo, setEditingCombo] = useState<ComboCatalogDetails | null>(null)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <CombosTable combos={combos} state={state} onEdit={setEditingCombo} />
      {/* Remontar por combo deja que defaultValues repueble el formulario al
          cambiar de edición, sin sincronizarlo con un efecto. */}
      <ComboForm
        key={editingCombo?.id ?? "new"}
        editingCombo={editingCombo}
        products={products}
        categories={categories}
        onFinished={() => setEditingCombo(null)}
      />
    </div>
  )
}
