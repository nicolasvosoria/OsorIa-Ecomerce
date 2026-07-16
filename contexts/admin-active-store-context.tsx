"use client"

import { createContext, useContext, type ReactNode } from "react"

// La tienda activa la decide el servidor (`authorizeActiveStoreAdmin` en
// app/admin/layout.tsx) y baja por aquí sin pasar por el cliente: la cookie
// `active-store` es httpOnly y la cookie `store_id` legible sólo conoce el HOST,
// que no es la tienda que el switcher tenga activa.
const AdminActiveStoreContext = createContext<string | undefined>(undefined)

export function AdminActiveStoreProvider({
  storeId,
  children,
}: {
  storeId: string
  children: ReactNode
}) {
  return (
    <AdminActiveStoreContext.Provider value={storeId}>{children}</AdminActiveStoreContext.Provider>
  )
}

export function useAdminActiveStoreId(): string {
  const storeId = useContext(AdminActiveStoreContext)
  if (storeId === undefined) {
    throw new Error("useAdminActiveStoreId debe usarse dentro de AdminActiveStoreProvider")
  }
  return storeId
}
