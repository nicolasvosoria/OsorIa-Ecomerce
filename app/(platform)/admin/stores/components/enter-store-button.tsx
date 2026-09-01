"use client"

import { useTransition } from "react"
import { LogIn, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { setActiveStore } from "@/app/admin/actions/active-store"
import { toStoreHost } from "@/lib/utils/store-host"

export function EnterStoreButton({
  storeId,
  storeName,
  subdomain,
}: {
  storeId: string
  storeName: string
  subdomain: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleEnter() {
    startTransition(async () => {
      const result = await setActiveStore(storeId)
      if (!result.success) {
        toast.error(result.error ?? `No se pudo entrar a ${storeName}`)
        return
      }

      window.location.assign(
        `${window.location.protocol}//${toStoreHost(subdomain, window.location.host)}/admin`,
      )
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={isPending}
      onClick={handleEnter}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      <span>Entrar a tienda</span>
    </Button>
  )
}
