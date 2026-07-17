"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GLOBAL_ROLE_LABELS, GLOBAL_ROLE_NAMES } from "@/lib/memberships/roles"
import type { UserRole } from "@/lib/types/user"
import { setUserGlobalRoleAction } from "../actions"

// StoresLayout gates the whole console on super_admin, so the selector is always
// live here — it needs no per-viewer permission check. A super_admin still can't
// demote themselves (guarded server-side too), so their own row shows a badge
// instead of an editable select.
export function UserGlobalRoleSelect({
  userId,
  role,
  currentUserId,
}: {
  userId: string
  role: UserRole
  currentUserId: string
}) {
  const [current, setCurrent] = useState<UserRole>(role)
  const [isPending, startTransition] = useTransition()

  if (userId === currentUserId) {
    return <Badge variant="default">{GLOBAL_ROLE_LABELS[current]}</Badge>
  }

  function handleChange(value: string) {
    const nextRole = value as UserRole
    const previousRole = current
    setCurrent(nextRole)

    startTransition(async () => {
      const result = await setUserGlobalRoleAction(userId, nextRole)
      if (result.success) {
        toast.success("Rol global actualizado")
        return
      }

      setCurrent(previousRole)
      toast.error(result.error ?? "No se pudo actualizar el rol global")
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={current} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="editor-chrome">
          {GLOBAL_ROLE_NAMES.map((roleName) => (
            <SelectItem key={roleName} value={roleName}>
              {GLOBAL_ROLE_LABELS[roleName]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
    </div>
  )
}
