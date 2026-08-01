"use client"

import Link from "next/link"
import { EyeOff, PauseCircle } from "lucide-react"

import type { StoreServingState } from "@/lib/stores/serving-state"
import { Badge } from "@/components/ui/badge"

const PUBLICATION_PANEL_ROUTE = "/admin/settings"

// Comparte los ajustes del badge de la tienda que ya vive en la topbar, para que
// el estado se lea como una nota de la misma identidad y no como otro control.
const STATE_BADGE_CLASSNAME = "min-w-0 shrink gap-1.5 font-normal normal-case"

// El caso en calma no gasta atención del dueño: una tienda que sí se está
// sirviendo no muestra nada. Solo hablamos cuando su tienda no está llegando a
// nadie, y `null` es "no se pudo resolver", que tampoco merece una afirmación.
export function StoreServingStateBadge({ state }: { state: StoreServingState | null }) {
  if (state === "unpublished") {
    return (
      <Badge asChild variant="secondary" className={STATE_BADGE_CLASSNAME}>
        <Link href={PUBLICATION_PANEL_ROUTE}>
          <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">Sin publicar</span>
          <span className="sr-only"> — publícala en Configuración</span>
        </Link>
      </Badge>
    )
  }

  // Sin enlace a la publicación a propósito: el interruptor del dueño no levanta
  // una suspensión, y ofrecérselo sería mandarlo a un control que no la arregla.
  if (state === "suspended") {
    return (
      <Badge variant="secondary" className={STATE_BADGE_CLASSNAME}>
        <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">Suspendida por la plataforma</span>
      </Badge>
    )
  }

  return null
}
