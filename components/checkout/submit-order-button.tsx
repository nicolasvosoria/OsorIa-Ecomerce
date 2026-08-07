"use client"

import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { useLanguage } from "@/contexts/language-context"

// Botón de envío compartido por el checkout de invitado y el autenticado:
// mismo wrapping, tamaño y estado de carga en los dos formularios. `disabled`
// cubre un motivo AJENO a estar cargando -- D7: un envío bloqueado (destino
// fuera de zona) no debe poder enviarse aunque el formulario esté listo.
export function SubmitOrderButton({ isLoading, disabled = false }: { isLoading: boolean; disabled?: boolean }) {
  const { t } = useLanguage()

  return (
    <div className="flex justify-end gap-4">
      <Button type="submit" size="lg" disabled={isLoading || disabled} className="min-w-[200px]">
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
