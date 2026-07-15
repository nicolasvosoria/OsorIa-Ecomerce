"use client"

import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addMemberSchema, type AddMemberFormValues } from "@/lib/memberships/schemas"
import { STORE_ROLE_LABELS, STORE_ROLE_NAMES } from "@/lib/memberships/roles"
import { addStoreMemberAction } from "../actions"

const emptyValues: AddMemberFormValues = { email: "", role: "admin" }

type AddMemberFormProps = {
  onSuccess?: () => void
}

export function AddMemberForm({ onSuccess }: AddMemberFormProps) {
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
        onSuccess?.()
        return
      }

      toast.error(result.error ?? "No se pudo agregar al miembro")
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        id="member-email"
        label="Correo del usuario"
        hint="El usuario debe tener una cuenta registrada en la plataforma."
        error={errors.email?.message}
      >
        {(field) => (
          <Input {...field} type="email" placeholder="persona@correo.com" {...register("email")} />
        )}
      </FormField>
      <FormField id="member-role" label="Rol en la tienda">
        {(field) => (
          <Controller
            control={control}
            name="role"
            render={({ field: role }) => (
              <Select value={role.value} onValueChange={role.onChange}>
                <SelectTrigger {...field} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="editor-chrome">
                  {STORE_ROLE_NAMES.map((roleName) => (
                    <SelectItem key={roleName} value={roleName}>
                      {STORE_ROLE_LABELS[roleName]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>
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
