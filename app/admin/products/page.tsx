import Link from "next/link"
import { redirect } from "next/navigation"
import { Package, Plus, Tag } from "lucide-react"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { DEFAULT_PAGE_SIZE, parsePositiveInt } from "@/lib/admin/pagination"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { getItems } from "@/lib/supabase/products-api"
import type { StoreItemWithDetails } from "@/lib/types/products"
import { ProductsTable } from "./components/products-table"

type ProductsPageProps = {
  searchParams: Promise<{ page?: string; pageSize?: string }>
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
    <AdminPageContainer>
      <AdminPageHeader
        title="Gestión de Productos"
        subtitle="Administra tu catálogo de productos"
        actions={
          <>
            <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 sm:gap-2">
              <Link href="/admin/products/categories">
                <Tag className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Categorías</span>
              </Link>
            </Button>
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
          </>
        }
      />

      <ProductsTable
        rows={list.state === "ready" ? list.products : []}
        state={list.state}
        pagination={{ page, pageSize, total: list.total }}
      />
    </AdminPageContainer>
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
        is_active: null,
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
