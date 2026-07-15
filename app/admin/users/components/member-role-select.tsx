"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  STORE_ROLE_LABELS,
  STORE_ROLE_NAMES,
  type StoreRoleName,
} from "@/lib/memberships/roles"
import { updateMembershipRoleAction } from "../actions"

export function MemberRoleSelect({
  userId,
  role,
  isSelf,
}: {
  userId: string
  role: StoreRoleName
  isSelf: boolean
}) {
  const [current, setCurrent] = useState<StoreRoleName>(role)
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string) {
    const nextRole = value as StoreRoleName
    const previousRole = current
    setCurrent(nextRole)

    startTransition(async () => {
      const result = await updateMembershipRoleAction(userId, nextRole)
      if (result.success) {
        toast.success("Rol del miembro actualizado")
        return
      }

      setCurrent(previousRole)
      toast.error(result.error ?? "No se pudo actualizar el rol")
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={current} onValueChange={handleChange} disabled={isPending || isSelf}>
        <SelectTrigger className="h-9 w-[160px]">
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
      {isPending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
    </div>
  )
}
