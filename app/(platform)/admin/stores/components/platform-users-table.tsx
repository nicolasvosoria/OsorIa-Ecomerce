"use client"

import { Mail, User } from "lucide-react"

import { DataTable, type Column, type DataTableState } from "@/components/admin/data-table"
import type { PlatformUser } from "@/lib/supabase/platform-users-api"
import { UserGlobalRoleSelect } from "./user-global-role-select"

type PlatformUsersTableProps = {
  rows: PlatformUser[]
  state: DataTableState
  currentUserId: string
}

export function PlatformUsersTable({ rows, state, currentUserId }: PlatformUsersTableProps) {
  return (
    <DataTable
      columns={buildColumns(currentUserId)}
      rows={rows}
      state={state}
      emptyMessage="No hay usuarios registrados todavía."
      errorMessage="No se pudieron cargar los usuarios"
    />
  )
}

function buildColumns(currentUserId: string): Column<PlatformUser>[] {
  return [
    {
      key: "user",
      header: "Usuario",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="font-medium">{formatUserName(user)}</div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (user) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{user.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol global",
      cell: (user) => (
        <UserGlobalRoleSelect
          userId={user.id}
          role={user.role ?? "user"}
          currentUserId={currentUserId}
        />
      ),
    },
    {
      key: "created",
      header: "Fecha de registro",
      cell: (user) =>
        user.created_at ? (
          <span className="text-sm">{formatRegistrationDate(user.created_at)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "signup-store",
      header: "Tienda de origen",
      cell: (user) => <span className="text-sm">{user.signupStoreName ?? "—"}</span>,
    },
  ]
}

function formatUserName(user: PlatformUser): string {
  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
  return fullName || "Sin nombre"
}

function formatRegistrationDate(value: string): string {
  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
