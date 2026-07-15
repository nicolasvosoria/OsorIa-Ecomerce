import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { listStoreMembers, type StoreMember } from "@/lib/supabase/memberships-api"
import { TeamSection } from "./components/team-section"
import { ClientsSection } from "./components/clients-section"

export default async function AdminUsersPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const team = await loadTeam(authorization.storeId)

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Gestión de Usuarios"
        subtitle="Administra el equipo de tu tienda y los usuarios de la plataforma."
      />

      <TeamSection
        members={team.members}
        state={team.state}
        currentUserId={authorization.userId}
      />
      <ClientsSection currentUserId={authorization.userId} />
    </AdminPageContainer>
  )
}

type TeamData = { members: StoreMember[]; state: "ready" | "empty" | "error" }

async function loadTeam(storeId: string): Promise<TeamData> {
  try {
    const members = await listStoreMembers(storeId)
    return { members, state: members.length === 0 ? "empty" : "ready" }
  } catch (error) {
    console.error("[Admin Users] Error al cargar el equipo:", error)
    return { members: [], state: "error" }
  }
}
