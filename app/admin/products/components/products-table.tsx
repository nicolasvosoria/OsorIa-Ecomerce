"use client"

import Image from "next/image"
import Link from "next/link"
import { Edit, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column, type DataTableState } from "@/components/admin/data-table"
import type { StoreItemWithDetails } from "@/lib/types/products"
import { formatPrice } from "@/lib/commerce/utils"
import { DeleteProductButton } from "./delete-product-button"

type ProductsTableProps = {
  rows: StoreItemWithDetails[]
  state: DataTableState
  pagination: { page: number; pageSize: number; total: number }
}

export function ProductsTable({ rows, state, pagination }: ProductsTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      state={state}
      emptyMessage="Aún no hay productos en tu tienda"
      errorMessage="No se pudieron cargar los productos"
      pagination={pagination}
    />
  )
}

const columns: Column<StoreItemWithDetails>[] = [
  {
    key: "image",
    header: "Imagen",
    className: "w-[80px]",
    cell: (product) => (
      <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={product.primary_image_alt || product.item_name}
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
    key: "name",
    header: "Nombre",
    cell: (product) => (
      <div>
        <div className="font-medium">{product.item_name}</div>
        {product.item_code && (
          <div className="text-sm text-muted-foreground">Código: {product.item_code}</div>
        )}
      </div>
    ),
  },
  {
    key: "category",
    header: "Categoría",
    cell: (product) =>
      product.category?.category_name || (
        <span className="text-muted-foreground">Sin categoría</span>
      ),
  },
  {
    key: "price",
    header: "Precio",
    cell: (product) => (
      <div>
        <div className="font-medium">
          {formatPrice(product.base_price.toString(), product.currency_code)}
        </div>
        {product.compare_at_price && (
          <div className="text-sm text-muted-foreground line-through">
            {formatPrice(product.compare_at_price.toString(), product.currency_code)}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "stock",
    header: "Stock",
    cell: (product) =>
      product.track_inventory ? (
        <div>
          <div className="font-medium">{product.inventory_quantity}</div>
          {product.inventory_quantity <= product.low_stock_threshold && (
            <Badge variant="destructive" className="mt-1 text-xs">
              Stock bajo
            </Badge>
          )}
        </div>
      ) : (
        <Badge variant="outline" className="w-fit text-xs font-normal">
          Sin seguimiento
        </Badge>
      ),
  },
  {
    key: "status",
    header: "Estado",
    cell: (product) => (
      <div className="flex flex-wrap items-center gap-1.5">
        {!product.is_active && <Badge variant="secondary">Inactivo</Badge>}
        {product.is_featured && (
          <Badge variant="outline" className="w-fit">
            Destacado
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "actions",
    header: <span className="sr-only">Acciones</span>,
    className: "text-right",
    cell: (product) => (
      <div className="flex items-center justify-end gap-1">
        {product.item_slug && (
          <Button variant="ghost" size="icon" aria-label="Ver en la tienda" asChild>
            <Link href={`/products/${product.item_slug}`} target="_blank">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Editar producto" asChild>
          <Link href={`/admin/products/${product.id}/edit`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        <DeleteProductButton productId={product.id} productName={product.item_name} />
      </div>
    ),
  },
]
