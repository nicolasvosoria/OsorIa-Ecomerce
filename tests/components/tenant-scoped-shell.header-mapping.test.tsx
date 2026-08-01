import type { ReactNode } from "react"
import { isValidElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: { value: new Headers() },
}))

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.value,
}))

// Estorbos del <html> que arrastra `app/layout.tsx` y que nada tienen que ver
// con el mapeo: `geist` importa next/font/local (solo resuelve dentro del build
// de Next) y jsdom no sabe parsear el CSS que emite Tailwind v4.
vi.mock("geist/font/sans", () => ({ GeistSans: { variable: "--font-geist-sans" } }))
vi.mock("geist/font/mono", () => ({ GeistMono: { variable: "--font-geist-mono" } }))
vi.mock("@/app/globals.css", () => ({}))

import { TenantScopedShell } from "@/app/layout"
import { StoreProvider } from "@/contexts/store-context"
import { StylesProvider } from "@/contexts/styles-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { RouteAwareChrome } from "@/components/layout/route-aware-chrome"
import {
  NEUTRAL_PAGE_HEADER,
  NEUTRAL_PAGE_KIND,
  UNKNOWN_TENANT_HEADER,
  UNKNOWN_TENANT_VALUE,
} from "@/lib/stores/neutral-page"

function findPropsOf(tree: ReactNode, component: unknown): Record<string, unknown> | null {
  if (!isValidElement(tree)) return null

  const props = tree.props as { children?: ReactNode }
  if (tree.type === component) return props as Record<string, unknown>

  const children = Array.isArray(props.children) ? props.children : [props.children]
  for (const child of children) {
    const found = findPropsOf(child, component)
    if (found) return found
  }
  return null
}

async function renderShellWith(headerEntries: Record<string, string>) {
  requestHeaders.value = new Headers(headerEntries)
  const tree = await TenantScopedShell({ children: null })

  return {
    isNeutralPage: findPropsOf(tree, RouteAwareChrome)?.isNeutralPage,
    storeIsUnknownTenant: findPropsOf(tree, StoreProvider)?.isUnknownTenant,
    stylesIsUnknownTenant: findPropsOf(tree, StylesProvider)?.isUnknownTenant,
    themeIsUnknownTenant: findPropsOf(tree, ThemeProvider)?.isUnknownTenant,
  }
}

// El proxy sirve los avisos por reescritura, así que estos headers son la única
// señal que distingue un aviso de un storefront (D3): si el layout leyera el
// header equivocado o invirtiera el booleano, el aviso saldría vestido de tienda
// y ningún test de `RouteAwareChrome` —que recibe el prop ya resuelto— lo vería.
describe("TenantScopedShell mapping the proxy headers to provider props", () => {
  beforeEach(() => {
    requestHeaders.value = new Headers()
  })

  it("stands the chrome down for the store-inactive notice, keeping the tenant identity", async () => {
    const shell = await renderShellWith({
      [NEUTRAL_PAGE_HEADER]: NEUTRAL_PAGE_KIND.storeInactive,
    })

    expect(shell.isNeutralPage).toBe(true)
    expect(shell.storeIsUnknownTenant).toBe(false)
    expect(shell.stylesIsUnknownTenant).toBe(false)
    expect(shell.themeIsUnknownTenant).toBe(false)
  })

  it("also suppresses the tenant identity for the store-not-found notice", async () => {
    const shell = await renderShellWith({
      [NEUTRAL_PAGE_HEADER]: NEUTRAL_PAGE_KIND.storeNotFound,
      [UNKNOWN_TENANT_HEADER]: UNKNOWN_TENANT_VALUE,
    })

    expect(shell.isNeutralPage).toBe(true)
    expect(shell.storeIsUnknownTenant).toBe(true)
    expect(shell.stylesIsUnknownTenant).toBe(true)
    expect(shell.themeIsUnknownTenant).toBe(true)
  })

  it("leaves an ordinary storefront request untouched when no marker arrives", async () => {
    const shell = await renderShellWith({})

    expect(shell.isNeutralPage).toBe(false)
    expect(shell.storeIsUnknownTenant).toBe(false)
    expect(shell.stylesIsUnknownTenant).toBe(false)
    expect(shell.themeIsUnknownTenant).toBe(false)
  })

  it("ignores an unknown-tenant header that does not carry the agreed value", async () => {
    const shell = await renderShellWith({ [UNKNOWN_TENANT_HEADER]: "0" })

    expect(shell.storeIsUnknownTenant).toBe(false)
  })
})
