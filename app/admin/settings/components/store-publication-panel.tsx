"use client"

import { useState, useTransition } from "react"
import { Globe, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { setActiveStorePublication } from "@/app/admin/actions/store-publication"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function StorePublicationPanel({ initialIsPublic }: { initialIsPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const nextIsPublic = !isPublic

    startTransition(async () => {
      const result = await setActiveStorePublication(nextIsPublic)
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar la publicación de la tienda")
        return
      }

      setIsPublic(nextIsPublic)
      toast.success(nextIsPublic ? "Tienda publicada" : "Tienda despublicada")
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            Publicación de la tienda
          </CardTitle>
          <CardDescription>
            Una tienda privada no es visible para los clientes; solo tú puedes verla desde el
            admin.
          </CardDescription>
        </div>
        <Badge variant={isPublic ? "default" : "secondary"}>
          {isPublic ? "Pública" : "Privada"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Los cambios pueden tardar unos minutos en verse en la tienda.
        </p>
        <Button onClick={handleToggle} disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPublic ? "Despublicar tienda" : "Publicar tienda"}
        </Button>
      </CardContent>
    </Card>
  )
}
