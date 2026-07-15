import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Package, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { getItems } from "@/lib/supabase/products-api"
import type { StoreItemWithDetails } from "@/lib/types/products"
import { ProductsTable } from "./components/products-table"

const DEFAULT_PAGE_SIZE = 20

type ProductsPageProps = {
  searchParams: Promise<{ page?: string; pageSize?: string }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { page: pageParam, pageSize: pageSizeParam } = await searchParams
  const page = parsePositiveInt(pageParam, 1)
  const pageSize = parsePositiveInt(pageSizeParam, DEFAULT_PAGE_SIZE)

  const list = await loadProducts(authorization.supabase, authorization.storeId, page, pageSize)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Gestión de Productos</h1>
            <p className="text-sm text-muted-foreground">Administra tu catálogo de productos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 sm:gap-2">
            <Link href="/admin/products/combos">
              <Package className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Combos</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="shrink-0 gap-1.5 sm:gap-2">
            <Link href="/admin/products/create">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </Link>
          </Button>
        </div>
      </header>

      <ProductsTable
        rows={list.state === "ready" ? list.products : []}
        state={list.state}
        pagination={{ page, pageSize, total: list.total }}
      />
    </div>
  )
}

type ProductsList =
  | { state: "ready"; products: StoreItemWithDetails[]; total: number }
  | { state: "empty"; total: number }
  | { state: "error"; total: number }

async function loadProducts(
  supabase: any,
  storeId: string,
  page: number,
  pageSize: number,
): Promise<ProductsList> {
  try {
    const { items, total } = await getItems(
      {
        store_id: storeId,
        item_kind: "products",
        is_active: true,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        order_by: "created_at",
        order_direction: "desc",
      },
      supabase,
    )

    if (items.length === 0) {
      return { state: "empty", total }
    }

    return { state: "ready", products: items, total }
  } catch (error) {
    console.error("[Admin Products] Error al cargar productos:", error)
    return { state: "error", total: 0 }
  }
}
