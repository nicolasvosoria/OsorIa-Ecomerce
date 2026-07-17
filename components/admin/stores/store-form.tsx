"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Store } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { TempPasswordReveal } from "@/components/admin/temp-password-reveal"
import { createStoreSchema, type CreateStoreFormValues } from "@/lib/stores/schemas"
import { createTenantAction } from "@/app/(platform)/admin/stores/actions"

const STORES_PATH = "/admin/stores"

const emptyValues: CreateStoreFormValues = {
  storeName: "",
  subdomain: "",
  ownerEmail: "",
  currencyCode: "COP",
  ownerFirstName: "",
  ownerLastName: "",
}

export function StoreForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStoreFormValues>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: emptyValues,
  })

  const createStore = (values: CreateStoreFormValues) => {
    startTransition(async () => {
      const result = await createTenantAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      // A minted owner gets a temporary password: keep the operator on this page
      // with it, since it will never be shown again.
      if (result.tempPassword) {
        setTempPassword(result.tempPassword)
        toast.success("Tienda creada. Comparte la contraseña temporal con el dueño.")
        reset(emptyValues)
        return
      }

      toast.success("Tienda creada")
      router.push(STORES_PATH)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la tienda</CardTitle>
        <CardDescription>
          El subdominio define la URL de la tienda y no se puede cambiar después. La tienda nace
          despublicada; su dueño la administra y decide cuándo publicarla.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(createStore)} className="space-y-4">
          <FormField id="storeName" label="Nombre de la tienda *" error={errors.storeName?.message}>
            {(field) => <Input {...field} {...register("storeName")} />}
          </FormField>

          <FormField
            id="subdomain"
            label="Subdominio *"
            hint="Solo minúsculas, números y guiones; por ejemplo mi-tienda."
            error={errors.subdomain?.message}
          >
            {(field) => <Input {...field} placeholder="mi-tienda" {...register("subdomain")} />}
          </FormField>

          <FormField
            id="currencyCode"
            label="Moneda *"
            hint="Código ISO de 3 letras mayúsculas."
            error={errors.currencyCode?.message}
          >
            {(field) => <Input {...field} placeholder="COP" {...register("currencyCode")} />}
          </FormField>

          <FormField
            id="ownerEmail"
            label="Correo del dueño *"
            hint="Si el correo no tiene cuenta, se creará una con una contraseña temporal."
            error={errors.ownerEmail?.message}
          >
            {(field) => (
              <Input {...field} type="email" placeholder="duena@correo.com" {...register("ownerEmail")} />
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="ownerFirstName" label="Nombre del dueño">
              {(field) => <Input {...field} {...register("ownerFirstName")} />}
            </FormField>
            <FormField id="ownerLastName" label="Apellido del dueño">
              {(field) => <Input {...field} {...register("ownerLastName")} />}
            </FormField>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href={STORES_PATH}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Store className="mr-2 h-4 w-4" />
              )}
              Crear tienda
            </Button>
          </div>

          {tempPassword ? (
            <TempPasswordReveal
              value={tempPassword}
              title="Contraseña temporal del dueño"
              recipient="al dueño"
            />
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
