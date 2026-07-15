import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import {
  listCategoriesWithProductCounts,
  type CategoryWithProductCount,
} from "@/lib/supabase/categories-api"
import { CategoriesTable } from "./components/categories-table"

export default async function AdminCategoriesPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const list = await loadCategories(authorization.supabase, authorization.storeId)

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader
        title="Categorías de productos"
        subtitle="Organiza el catálogo y controla la URL pública de cada categoría."
        actions={
          <Button asChild size="sm" className="shrink-0 gap-1.5 sm:gap-2">
            <Link href="/admin/products/categories/create">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Nueva categoría</span>
            </Link>
          </Button>
        }
      />

      <CategoriesTable
        categories={list.state === "ready" ? list.categories : []}
        state={list.state}
      />
    </AdminPageContainer>
  )
}

type CategoriesList =
  | { state: "ready"; categories: CategoryWithProductCount[] }
  | { state: "empty" }
  | { state: "error" }

async function loadCategories(supabase: any, storeId: string): Promise<CategoriesList> {
  try {
    const categories = await listCategoriesWithProductCounts(storeId, supabase)

    if (categories.length === 0) {
      return { state: "empty" }
    }

    return { state: "ready", categories }
  } catch (error) {
    console.error("[Admin Categorías] Error al cargar categorías:", error)
    return { state: "error" }
  }
}
