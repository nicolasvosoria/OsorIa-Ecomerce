import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
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
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              Administra el equipo de tu tienda y los usuarios de la plataforma.
            </p>
          </div>
        </div>
      </header>

      <TeamSection
        members={team.members}
        state={team.state}
        currentUserId={authorization.userId}
      />
      <ClientsSection currentUserId={authorization.userId} />
    </div>
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
