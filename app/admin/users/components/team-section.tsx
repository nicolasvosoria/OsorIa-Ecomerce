"use client"

import { Mail } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/admin/data-table"
import { STORE_ROLE_LABELS } from "@/lib/memberships/roles"
import type { StoreMember } from "@/lib/supabase/memberships-api"
import { AddMemberDialog } from "./add-member-dialog"
import { MemberRoleSelect } from "./member-role-select"
import { RemoveMemberButton } from "./remove-member-button"

type TeamSectionProps = {
  members: StoreMember[]
  state: "ready" | "empty" | "error"
  currentUserId: string
}

export function TeamSection({ members, state, currentUserId }: TeamSectionProps) {
  const columns = buildColumns(currentUserId)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Equipo</h2>
          <p className="text-sm text-muted-foreground">
            Miembros con acceso de administración a esta tienda.
          </p>
        </div>
        <AddMemberDialog />
      </div>
      <Card>
        <CardContent className="p-2 sm:p-6">
          <DataTable
            columns={columns}
            rows={members}
            state={state}
            emptyMessage="Aún no hay miembros en el equipo de esta tienda."
            errorMessage="No se pudieron cargar los miembros"
          />
        </CardContent>
      </Card>
    </section>
  )
}

function buildColumns(currentUserId: string): Column<StoreMember>[] {
  return [
    {
      key: "member",
      header: "Miembro",
      cell: (member) => (
        <div>
          <div className="font-medium">{member.name}</div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>{member.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      cell: (member) => <MemberRoleCell member={member} currentUserId={currentUserId} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      className: "text-right",
      cell: (member) =>
        member.userId === currentUserId ? (
          <Badge variant="outline">Tú</Badge>
        ) : (
          <RemoveMemberButton userId={member.userId} memberLabel={member.name || member.email} />
        ),
    },
  ]
}

function MemberRoleCell({
  member,
  currentUserId,
}: {
  member: StoreMember
  currentUserId: string
}) {
  if (!member.role) {
    return <Badge variant="secondary">Sin rol</Badge>
  }

  const isSelf = member.userId === currentUserId
  if (isSelf) {
    return <Badge variant="default">{STORE_ROLE_LABELS[member.role]}</Badge>
  }

  return <MemberRoleSelect userId={member.userId} role={member.role} isSelf={isSelf} />
}
