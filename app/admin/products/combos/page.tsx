import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { listCombos } from "@/lib/supabase/combos-api"
import type { ComboCatalogDetails } from "@/lib/combos/types"
import { CombosTable } from "./components/combos-table"

export default async function AdminCombosPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const list = await loadCombos(authorization.supabase, authorization.storeId)

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Combos de productos"
        subtitle="Crea combos vendibles con descuento y stock derivado."
        actions={
          <Button asChild size="sm" className="shrink-0 gap-1.5 sm:gap-2">
            <Link href="/admin/products/combos/create">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Nuevo combo</span>
            </Link>
          </Button>
        }
      />

      <CombosTable combos={list.state === "ready" ? list.combos : []} state={list.state} />
    </AdminPageContainer>
  )
}

type CombosList =
  | { state: "ready"; combos: ComboCatalogDetails[] }
  | { state: "empty" }
  | { state: "error" }

async function loadCombos(supabase: any, storeId: string): Promise<CombosList> {
  try {
    const combos = await listCombos({
      store_id: storeId,
      includeInactive: true,
      supabaseOverride: supabase,
    })

    if (combos.length === 0) {
      return { state: "empty" }
    }

    return { state: "ready", combos }
  } catch (error) {
    console.error("[Admin Combos] Error al cargar combos:", error)
    return { state: "error" }
  }
}
