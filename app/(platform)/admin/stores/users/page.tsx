import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeSuperAdmin } from "@/lib/supabase/active-store"
import { listPlatformUsers, type PlatformUser } from "@/lib/supabase/platform-users-api"
import { PlatformUsersTable } from "../components/platform-users-table"

export default async function PlatformUsersPage() {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    redirect("/admin/stores")
  }

  const list = await loadUsers()

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Usuarios de la plataforma"
        subtitle="Todas las cuentas registradas en la plataforma y su rol global"
      />

      <PlatformUsersTable
        rows={list.state === "ready" ? list.users : []}
        state={list.state}
        currentUserId={authorization.userId}
      />
    </AdminPageContainer>
  )
}

type UsersList =
  | { state: "ready"; users: PlatformUser[] }
  | { state: "empty" }
  | { state: "error" }

async function loadUsers(): Promise<UsersList> {
  try {
    const users = await listPlatformUsers()
    return users.length === 0 ? { state: "empty" } : { state: "ready", users }
  } catch (error) {
    console.error("[Platform Users] Error al cargar los usuarios:", error)
    return { state: "error" }
  }
}
