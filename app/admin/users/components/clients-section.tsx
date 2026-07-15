"use client"

import { useEffect, useState } from "react"
import { Mail, User } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/admin/data-table"
import { getUsers } from "@/lib/supabase/users-api"
import { ADMIN_LIST_FETCH_LIMIT } from "@/lib/admin/constants"
import type { UserProfile } from "@/lib/types/user"
import { UserGlobalRoleControl } from "./user-global-role-select"

type ClientsState = "loading" | "ready" | "empty" | "error"

export function ClientsSection({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [total, setTotal] = useState(0)
  const [state, setState] = useState<ClientsState>("loading")

  useEffect(() => {
    let active = true

    getUsers({ limit: ADMIN_LIST_FETCH_LIMIT, order_by: "created_at", order_direction: "desc" })
      .then((result) => {
        if (!active) return
        setUsers(result.users)
        setTotal(result.total)
        setState(result.users.length === 0 ? "empty" : "ready")
      })
      .catch((error) => {
        if (!active) return
        console.error("[Admin Users] Error al cargar clientes:", error)
        setState("error")
      })

    return () => {
      active = false
    }
  }, [])

  const columns = buildColumns(currentUserId)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Clientes</h2>
        <p className="text-sm text-muted-foreground">
          Usuarios registrados en la plataforma. Solo lectura, salvo el rol global (super admin).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios registrados{state === "ready" ? ` (${total})` : ""}</CardTitle>
          <CardDescription>Se crean automáticamente al registrarse.</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <DataTable
            columns={columns}
            rows={users}
            state={state}
            emptyMessage="No hay usuarios registrados todavía."
            errorMessage="No se pudieron cargar los usuarios"
          />
        </CardContent>
      </Card>
    </section>
  )
}

function buildColumns(currentUserId: string): Column<UserProfile>[] {
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
        <UserGlobalRoleControl
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
          <span className="text-muted-foreground">-</span>
        ),
    },
  ]
}

function formatUserName(user: UserProfile): string {
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
