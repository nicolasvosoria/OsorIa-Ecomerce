"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { updateTenantSettingsSchema, type UpdateTenantSettingsValues } from "@/lib/stores/schemas"
import { updateTenantSettings } from "../tenant-lifecycle-actions"

// D7(b): only name and currency are editable here — the subdomain is routing
// identity and never appears in this form (precedent: store-form.tsx).
export function TenantSettingsForm({
  storeId,
  storeName,
  currencyCode,
}: {
  storeId: string
  storeName: string
  currencyCode: string
}) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTenantSettingsValues>({
    resolver: zodResolver(updateTenantSettingsSchema),
    defaultValues: { storeName, currencyCode },
  })

  const saveSettings = (values: UpdateTenantSettingsValues) => {
    startTransition(async () => {
      const result = await updateTenantSettings(storeId, values)
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar la tienda")
        return
      }

      toast.success("Tienda actualizada")
      reset(values)
    })
  }

  return (
    <form onSubmit={handleSubmit(saveSettings)} className="space-y-4">
      <FormField id="storeName" label="Nombre de la tienda" error={errors.storeName?.message}>
        {(field) => <Input {...field} {...register("storeName")} />}
      </FormField>

      <FormField
        id="currencyCode"
        label="Moneda"
        hint="Código ISO de 3 letras mayúsculas."
        error={errors.currencyCode?.message}
      >
        {(field) => <Input {...field} placeholder="COP" {...register("currencyCode")} />}
      </FormField>

      <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>Guardar cambios</span>
      </Button>
    </form>
  )
}
