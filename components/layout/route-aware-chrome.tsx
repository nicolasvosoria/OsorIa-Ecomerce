"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { EditorPanel } from "@/components/admin/editor-panel"
import { MainContentWrapper } from "@/components/admin/main-content-wrapper"
import { FloatingContactButton } from "@/components/ui/floating-contact-button"
import { Header } from "@/components/layout/header"

interface RouteAwareChromeProps {
  children: ReactNode
}

const subscribeToHydrationStore = () => () => undefined
const clientHydrationSnapshot = () => true
const serverHydrationSnapshot = () => false

export function isAdminChromeRoute(pathname: string | null): boolean {
  return pathname === "/admin"
    || pathname?.startsWith("/admin/") === true
    || pathname === "/dashboard"
    || pathname?.startsWith("/dashboard/") === true
}

export function RouteAwareChrome({ children }: RouteAwareChromeProps) {
  const pathname = usePathname()
  const hasHydrated = useSyncExternalStore(
    subscribeToHydrationStore,
    clientHydrationSnapshot,
    serverHydrationSnapshot,
  )
  const showStorefrontChrome = hasHydrated && !isAdminChromeRoute(pathname)

  return (
    <>
      <MainContentWrapper>
        <main data-vaul-drawer-wrapper="true">
          {showStorefrontChrome && (
            <EditableWrapper componentName="header" label="Header">
              <Header />
            </EditableWrapper>
          )}
          {children}
        </main>
      </MainContentWrapper>
      {showStorefrontChrome && (
        <>
          <FloatingContactButton />
          <EditModeToggle />
          <EditorPanel />
        </>
      )}
    </>
  )
}
