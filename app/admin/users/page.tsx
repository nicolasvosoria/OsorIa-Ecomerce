import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { listStoreMembers, type StoreMember } from "@/lib/supabase/memberships-api"
import { listStoreCustomers, type StoreCustomer } from "@/lib/supabase/store-customers-api"
import { TeamSection } from "./components/team-section"
import { CustomersSection } from "./components/customers-section"

export default async function AdminUsersPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const [team, customers] = await Promise.all([
    loadTeam(authorization.storeId),
    loadCustomers(authorization.storeId),
  ])

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Gestión de Usuarios"
        subtitle="Administra el equipo y los clientes de tu tienda."
      />

      <TeamSection
        members={team.members}
        state={team.state}
        currentUserId={authorization.userId}
      />
      <CustomersSection customers={customers.customers} state={customers.state} />
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

type CustomersData = { customers: StoreCustomer[]; state: "ready" | "empty" | "error" }

async function loadCustomers(storeId: string): Promise<CustomersData> {
  try {
    const customers = await listStoreCustomers(storeId)
    return { customers, state: customers.length === 0 ? "empty" : "ready" }
  } catch (error) {
    console.error("[Admin Users] Error al cargar los clientes:", error)
    return { customers: [], state: "error" }
  }
}
