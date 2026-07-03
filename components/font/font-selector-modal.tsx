"use client"

import { useEffect, useState } from "react"
import { useFont } from "@/contexts/font-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { buildPairingStylesheetUrl, ensureStylesheetLink } from "@/lib/theme-font/bootstrap"
import type { AppFontPairing } from "@/lib/types/font"

interface FontSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ensurePairingPreviewFonts(pairing: AppFontPairing) {
  const combinedUrl = buildPairingStylesheetUrl(
    {
      font_name: pairing.heading_font_name,
      font_family: pairing.heading_font_family,
      google_font_url: pairing.heading_google_font_url,
    },
    {
      font_name: pairing.body_font_name,
      font_family: pairing.body_font_family,
      google_font_url: pairing.body_google_font_url,
    },
    pairing.heading_font_axis,
    pairing.body_font_axis,
  )

  if (combinedUrl) {
    ensureStylesheetLink(combinedUrl)
    return
  }

  if (pairing.heading_google_font_url) {
    ensureStylesheetLink(pairing.heading_google_font_url)
  }
  if (pairing.body_google_font_url) {
    ensureStylesheetLink(pairing.body_google_font_url)
  }
}

export function FontSelectorModal({ open, onOpenChange }: FontSelectorModalProps) {
  const { pairings, activePairing, loading, changePairing } = useFont()
  const [changing, setChanging] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (typeof document === "undefined") return

    pairings.forEach(ensurePairingPreviewFonts)
  }, [open, pairings])

  const handlePairingChange = async (pairingName: string) => {
    if (changing) return

    setChanging(pairingName)
    const result = await changePairing(pairingName)
    setChanging(null)

    if (result.success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Seleccionar Combinación de Tipografías</DialogTitle>
          <DialogDescription className="text-sm">
            Elige una combinación de título y texto para personalizar el estilo de la página
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pairings.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay combinaciones disponibles
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:gap-3 py-2 md:py-4">
            {pairings.map((pairing) => {
              const isActive = activePairing?.pairing_name === pairing.pairing_name
              const isChanging = changing === pairing.pairing_name

              return (
                <Button
                  key={pairing.id}
                  variant={isActive ? "default" : "outline"}
                  className="w-full justify-start h-auto p-3 md:p-4 text-sm md:text-base"
                  onClick={() => handlePairingChange(pairing.pairing_name)}
                  disabled={isChanging || isActive}
                >
                  <div className="flex items-center gap-2 md:gap-3 w-full">
                    <div className="flex-1 text-left min-w-0">
                      <div
                        className="text-base md:text-lg font-medium truncate"
                        style={{ fontFamily: pairing.heading_font_family }}
                      >
                        Aa Título
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {pairing.heading_font_name}
                      </div>
                      <div
                        className="text-sm truncate mt-1"
                        style={{ fontFamily: pairing.body_font_family }}
                      >
                        Texto de ejemplo para el cuerpo de la página
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {pairing.body_font_name}
                      </div>
                      {isActive && (
                        <div className="text-xs text-muted-foreground mt-1">Activa</div>
                      )}
                    </div>
                    {isChanging && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
