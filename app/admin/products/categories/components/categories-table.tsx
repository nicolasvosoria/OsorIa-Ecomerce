"use client"

import Image from "next/image"
import Link from "next/link"

import { DataTable, type Column, type DataTableState } from "@/components/admin/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CategoryWithProductCount } from "@/lib/supabase/categories-api"
import { CategoryRowActions } from "./category-row-actions"

type CategoriesTableProps = {
  categories: CategoryWithProductCount[]
  state: DataTableState
}

export function CategoriesTable({ categories, state }: CategoriesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Listado de categorías</CardTitle>
        <CardDescription>
          {state === "ready" ? `${categories.length} categorías configuradas` : "Categorías configuradas"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={categoryColumns}
          rows={categories}
          state={state}
          emptyMessage="No hay categorías aún."
          errorMessage="No se pudieron cargar las categorías"
        />
      </CardContent>
    </Card>
  )
}

const categoryColumns: Column<CategoryWithProductCount>[] = [
  {
    key: "image",
    header: "Imagen",
    className: "w-[80px]",
    cell: (category) => (
      <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
        {category.category_image_url ? (
          <Image
            src={category.category_image_url}
            alt={category.category_name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
    ),
  },
  {
    key: "category",
    header: "Categoría",
    cell: (category) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold">{category.category_name}</span>
        <Badge variant={category.is_active ? "default" : "secondary"}>
          {category.is_active ? "Activa" : "Inactiva"}
        </Badge>
      </div>
    ),
  },
  {
    key: "products",
    header: "Productos",
    cell: (category) => <span className="text-sm text-muted-foreground">{category.productCount}</span>,
  },
  {
    key: "display_order",
    header: "Orden",
    cell: (category) => <span className="text-sm text-muted-foreground">{category.display_order}</span>,
  },
  {
    key: "actions",
    header: <span className="sr-only">Acciones</span>,
    className: "text-right",
    cell: (category) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/products/categories/${category.id}/edit`}>Editar</Link>
        </Button>
        <CategoryRowActions
          categoryId={category.id}
          categoryName={category.category_name}
          isActive={category.is_active}
          productCount={category.productCount}
        />
      </div>
    ),
  },
]
