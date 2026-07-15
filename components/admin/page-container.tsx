import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

// El ancho constriñe la cabecera junto con el cuerpo, por eso vive aquí y no en
// AdminPageHeader.
const PAGE_MAX_WIDTHS = {
  full: null,
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const

type AdminPageWidth = keyof typeof PAGE_MAX_WIDTHS

export function AdminPageContainer({
  maxWidth = "full",
  children,
}: {
  maxWidth?: AdminPageWidth
  children: ReactNode
}) {
  return <div className={cn("space-y-6", PAGE_MAX_WIDTHS[maxWidth])}>{children}</div>
}
