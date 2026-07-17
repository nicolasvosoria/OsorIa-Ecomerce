"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Store } from "lucide-react"
import { toast } from "sonner"

import { setActiveStore } from "@/app/admin/actions/active-store"
import type { StoreSummary } from "@/lib/supabase/memberships-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const STORE_NAME_CLASSNAME = "max-w-[110px] truncate sm:max-w-[160px]"

export function StoreSwitcher({
  stores,
  activeStoreId,
}: {
  stores: StoreSummary[]
  activeStoreId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const activeStoreName =
    stores.find((store) => store.id === activeStoreId)?.store_name ?? "Selecciona tienda"

  if (stores.length <= 1) {
    return (
      <Badge variant="outline" className="gap-1.5 font-normal normal-case">
        <Store className="h-3.5 w-3.5" aria-hidden="true" />
        <span className={STORE_NAME_CLASSNAME}>
          {stores[0]?.store_name ?? "Sin tienda asignada"}
        </span>
      </Badge>
    )
  }

  const handleSelect = (storeId: string) => {
    if (storeId === activeStoreId) return

    startTransition(async () => {
      const result = await setActiveStore(storeId)
      if (!result.success) {
        toast.error(result.error ?? "No se pudo cambiar de tienda")
        return
      }

      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isPending}>
          <Store className="h-4 w-4" aria-hidden="true" />
          <span className={STORE_NAME_CLASSNAME}>{activeStoreName}</span>
          <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="editor-chrome w-64">
        <DropdownMenuLabel>Tiendas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={activeStoreId} onValueChange={handleSelect}>
          {stores.map((store) => (
            <DropdownMenuRadioItem key={store.id} value={store.id}>
              <span className="truncate">{store.store_name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
