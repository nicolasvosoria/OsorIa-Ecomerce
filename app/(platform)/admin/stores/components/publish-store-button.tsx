"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { setTenantPublication } from "@/app/admin/actions/store-publication"

export function PublishStoreButton({
  storeId,
  storeName,
  isPublic,
}: {
  storeId: string
  storeName: string
  isPublic: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await setTenantPublication(storeId, !isPublic)
      if (!result.success) {
        toast.error(result.error ?? `No se pudo actualizar la publicación de ${storeName}`)
        return
      }

      toast.success(isPublic ? `${storeName} despublicada` : `${storeName} publicada`)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={isPending}
      onClick={handleToggle}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <span>{isPublic ? "Despublicar" : "Publicar"}</span>
    </Button>
  )
}
