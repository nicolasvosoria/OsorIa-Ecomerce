"use client"

import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { useLanguage } from "@/contexts/language-context"

// Botón de envío compartido por el checkout de invitado y el autenticado:
// mismo wrapping, tamaño y estado de carga en los dos formularios.
export function SubmitOrderButton({ isLoading }: { isLoading: boolean }) {
  const { t } = useLanguage()

  return (
    <div className="flex justify-end gap-4">
      <Button type="submit" size="lg" disabled={isLoading} className="min-w-[200px]">
        {isLoading ? (
          <>
            <Loader size="default" className="mr-2" />
            {t.checkout.processing}
          </>
        ) : (
          t.checkout.placeOrder
        )}
      </Button>
    </div>
  )
}
