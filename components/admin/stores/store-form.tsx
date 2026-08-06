"use client"

import { useTransition } from "react"
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStoreFormValues>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: emptyValues,
  })

  // D20: the owner is invited natively, never handed a temporary password --
  // there is nothing left to reveal on this screen, so success always leaves
  // it for the console.
  const createStore = (values: CreateStoreFormValues) => {
    startTransition(async () => {
      const result = await createTenantAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Tienda creada. Invitamos al dueño por correo.")
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
            hint="Le enviamos una invitación a este correo para que elija su propia contraseña."
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
        </form>
      </CardContent>
    </Card>
  )
}
