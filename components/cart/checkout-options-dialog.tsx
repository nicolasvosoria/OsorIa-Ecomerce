"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { User, UserPlus, ArrowRight } from "lucide-react"
import Link from "next/link"

interface CheckoutOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseCart?: () => void
}

export function CheckoutOptionsDialog({
  open,
  onOpenChange,
  onCloseCart,
}: CheckoutOptionsDialogProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleGuestCheckout = () => {
    setIsNavigating(true)
    onCloseCart?.()
    // Pequeño delay para cerrar el diálogo antes de navegar
    setTimeout(() => {
      router.push("/checkout")
      onOpenChange(false)
      setIsNavigating(false)
    }, 200)
  }

  const handleCreateAccount = () => {
    setIsNavigating(true)
    onCloseCart?.()
    // Por ahora redirigir al checkout, donde se puede crear cuenta
    // TODO: Implementar página de registro si no existe
    setTimeout(() => {
      router.push("/checkout?createAccount=true")
      onOpenChange(false)
      setIsNavigating(false)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[92vw] !max-w-[48rem] !max-h-[92vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <DialogHeader className="space-y-2 mb-5">
          <DialogTitle className="text-xl sm:text-2xl leading-tight break-words">
            ¿Cómo deseas continuar?
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base leading-relaxed break-words">
            Elige una opción para finalizar tu compra
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Opción 1: Continuar como invitado */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-auto p-5 sm:p-6 hover:bg-accent transition-colors text-left"
            onClick={handleGuestCheckout}
            disabled={isNavigating}
          >
            <div className="flex items-start gap-4 w-full">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="font-semibold text-base sm:text-lg mb-2 leading-tight break-words">
                  Continuar como Invitado
                </div>
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words whitespace-normal">
                  Completa tu compra sin crear una cuenta. Podrás crear una cuenta más tarde si lo deseas.
                </div>
              </div>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </Button>

          {/* Opción 2: Crear cuenta */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-auto p-5 sm:p-6 hover:bg-accent transition-colors border-primary/20 text-left"
            onClick={handleCreateAccount}
            disabled={isNavigating}
          >
            <div className="flex items-start gap-4 w-full">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="font-semibold text-base sm:text-lg mb-2 leading-tight break-words">
                  Crear Cuenta y Continuar
                </div>
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words whitespace-normal">
                  Crea una cuenta gratuita para guardar tus pedidos, recibir ofertas exclusivas y más.
                </div>
              </div>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-1" />
            </div>
          </Button>
        </div>

        <div className="text-sm text-center text-muted-foreground pt-4 border-t leading-relaxed break-words">
          <p>
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/checkout?login=true"
              className="text-primary hover:underline font-medium inline"
              onClick={() => {
                onCloseCart?.()
                onOpenChange(false)
              }}
            >
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

