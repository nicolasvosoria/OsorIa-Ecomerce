"use client"

import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addMemberSchema, type AddMemberFormValues } from "@/lib/memberships/schemas"
import { STORE_ROLE_LABELS, STORE_ROLE_NAMES } from "@/lib/memberships/roles"
import { FieldError } from "@/components/admin/field-error"
import { addStoreMemberAction } from "../actions"

const emptyValues: AddMemberFormValues = { email: "", role: "admin" }

export function AddMemberForm() {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: emptyValues,
  })

  const onSubmit = (values: AddMemberFormValues) => {
    startTransition(async () => {
      const result = await addStoreMemberAction(values.email, values.role)
      if (result.success) {
        toast.success("Miembro agregado al equipo")
        reset(emptyValues)
        return
      }

      toast.error(result.error ?? "No se pudo agregar al miembro")
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="member-email">Correo del usuario</Label>
        <Input
          id="member-email"
          type="email"
          placeholder="persona@correo.com"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
        <p className="text-xs text-muted-foreground">
          El usuario debe tener una cuenta registrada en la plataforma.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Rol en la tienda</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORE_ROLE_NAMES.map((roleName) => (
                  <SelectItem key={roleName} value={roleName}>
                    {STORE_ROLE_LABELS[roleName]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Agregar miembro
      </Button>
    </form>
  )
}
