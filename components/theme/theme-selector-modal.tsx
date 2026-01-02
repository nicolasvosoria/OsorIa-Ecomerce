"use client"

import { useState } from "react"
import { useTheme } from "@/contexts/theme-context"
import { useStore } from "@/contexts/store-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ThemeSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemeSelectorModal({ open, onOpenChange }: ThemeSelectorModalProps) {
  const { themes, activeTheme, loading, changeTheme } = useTheme()
  const { store } = useStore()
  const [changing, setChanging] = useState<string | null>(null)

  // Verificar si el cambio de tema está deshabilitado para este subdominio
  const isThemeChangeDisabled = store?.subdomain === 'reposteria'

  const handleThemeChange = async (themeName: string) => {
    if (changing) return
    if (isThemeChangeDisabled) return // No permitir cambios si está deshabilitado

    setChanging(themeName)
    const result = await changeTheme(themeName)
    setChanging(null)

    if (result.success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Seleccionar Tema</DialogTitle>
          <DialogDescription className="text-sm">
            {isThemeChangeDisabled 
              ? "Los temas solo pueden ser modificados desde el panel de administración"
              : "Elige un tema para personalizar los colores de la página"}
          </DialogDescription>
        </DialogHeader>

        {isThemeChangeDisabled && (
          <Alert className="mb-4">
            <AlertDescription className="text-sm">
              En esta tienda, los temas solo pueden ser modificados desde el panel de administración.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : themes.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay temas disponibles
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:gap-3 py-2 md:py-4">
            {themes.map((theme) => {
              const isActive = activeTheme?.theme_name === theme.theme_name
              const isChanging = changing === theme.theme_name

              return (
                <Button
                  key={theme.id}
                  variant={isActive ? "default" : "outline"}
                  className="w-full justify-start h-auto p-3 md:p-4 text-sm md:text-base"
                  onClick={() => handleThemeChange(theme.theme_name)}
                  disabled={isChanging || isActive || isThemeChangeDisabled}
                >
                  <div className="flex items-center gap-2 md:gap-3 w-full">
                    <div
                      className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-border flex-shrink-0"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{theme.theme_name}</div>
                      {isActive && (
                        <div className="text-xs text-muted-foreground">Activo</div>
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
