"use client"

import Link from "next/link"
import { PackageCheck } from "lucide-react"

import { DataTable, type Column, type DataTableState } from "@/components/admin/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/commerce/utils"
import type { ComboCatalogDetails } from "@/lib/combos/types"
import { DeleteComboButton } from "./delete-combo-button"

type CombosTableProps = {
  combos: ComboCatalogDetails[]
  state: DataTableState
}

export function CombosTable({ combos, state }: CombosTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Listado de combos</CardTitle>
        <CardDescription>
          {state === "ready" ? `${combos.length} combos configurados` : "Combos configurados"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={comboColumns}
          rows={combos}
          state={state}
          emptyMessage="No hay combos aún."
          errorMessage="No se pudieron cargar los combos"
        />
      </CardContent>
    </Card>
  )
}

const comboColumns: Column<ComboCatalogDetails>[] = [
  {
    key: "combo",
    header: "Combo",
    cell: (combo) => (
      <div className="flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-primary" />
        <span className="font-semibold">{combo.name}</span>
        <Badge variant={combo.isActive ? "default" : "secondary"}>
          {combo.isActive ? "Activo" : "Inactivo"}
        </Badge>
        {!combo.availability.isAvailable && <Badge variant="destructive">Sin stock</Badge>}
      </div>
    ),
  },
  {
    key: "price",
    header: "Precio",
    cell: (combo) => <ComboPricing combo={combo} />,
  },
  {
    key: "components",
    header: "Componentes",
    cell: (combo) => (
      <ul className="text-sm text-muted-foreground">
        {combo.components.map((component) => (
          <li key={`${combo.id}-${component.productId}-${component.variantId || "base"}`}>
            {component.quantity}× {component.productName}
            {component.variantTitle ? ` · ${component.variantTitle}` : ""}
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: "actions",
    header: <span className="sr-only">Acciones</span>,
    className: "text-right",
    cell: (combo) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/products/combos/${combo.id}/edit`}>Editar</Link>
        </Button>
        <DeleteComboButton comboId={combo.id} comboName={combo.name} />
      </div>
    ),
  },
]

function ComboPricing({ combo }: { combo: ComboCatalogDetails }) {
  const { componentSubtotal, discountAmount, finalUnitPrice, currencyCode } = combo.pricing

  return (
    <p className="text-sm text-muted-foreground">
      {formatPrice(componentSubtotal.toString(), currencyCode)} - descuento{" "}
      {formatPrice(discountAmount.toString(), currencyCode)} ={" "}
      <strong className="text-foreground">
        {formatPrice(finalUnitPrice.toString(), currencyCode)}
      </strong>
    </p>
  )
}
