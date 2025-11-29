"use client"

import { useState } from "react"
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

interface FontSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FontSelectorModal({ open, onOpenChange }: FontSelectorModalProps) {
  const { fonts, activeFont, loading, changeFont } = useFont()
  const [changing, setChanging] = useState<string | null>(null)

  const handleFontChange = async (fontName: string) => {
    if (changing) return

    setChanging(fontName)
    const result = await changeFont(fontName)
    setChanging(null)

    if (result.success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Seleccionar Tipografía</DialogTitle>
          <DialogDescription className="text-sm">
            Elige una tipografía para personalizar el estilo de texto de la página
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : fonts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay fuentes disponibles
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:gap-3 py-2 md:py-4">
            {fonts.map((font) => {
              const isActive = activeFont?.font_name === font.font_name
              const isChanging = changing === font.font_name

              return (
                <Button
                  key={font.id}
                  variant={isActive ? "default" : "outline"}
                  className="w-full justify-start h-auto p-3 md:p-4 text-sm md:text-base"
                  onClick={() => handleFontChange(font.font_name)}
                  disabled={isChanging || isActive}
                  style={{ fontFamily: font.font_family }}
                >
                  <div className="flex items-center gap-2 md:gap-3 w-full">
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{font.font_name}</div>
                      <div className="text-xs text-muted-foreground truncate" style={{ fontFamily: font.font_family }}>
                        {font.font_family}
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
