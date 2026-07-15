"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Store } from "lucide-react"
import { toast } from "sonner"

import { setActiveStore } from "@/app/admin/actions/active-store"
import type { StoreSummary } from "@/lib/supabase/memberships-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function StoreSwitcher({
  stores,
  activeStoreId,
  isSuperAdmin,
}: {
  stores: StoreSummary[]
  activeStoreId: string
  isSuperAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (stores.length <= 1 && !isSuperAdmin) {
    return null
  }

  const activeStore = stores.find((store) => store.id === activeStoreId)

  const handleSelect = (storeId: string) => {
    if (storeId === activeStoreId) return

    startTransition(async () => {
      try {
        await setActiveStore(storeId)
        router.refresh()
      } catch (error) {
        console.error("[StoreSwitcher] Error al cambiar de tienda:", error)
        toast.error("No se pudo cambiar de tienda")
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isPending}>
          <Store className="h-4 w-4" aria-hidden="true" />
          <span className="hidden max-w-[160px] truncate sm:inline">
            {activeStore?.store_name ?? "Selecciona tienda"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="editor-chrome w-64">
        <DropdownMenuLabel>Tiendas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stores.map((store) => (
          <DropdownMenuItem key={store.id} onSelect={() => handleSelect(store.id)}>
            <span className="truncate">{store.store_name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
