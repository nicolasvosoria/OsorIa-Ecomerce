import { render } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/products/create",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}))

vi.mock("@/contexts/admin-permissions-context", () => ({
  useAdminPermissions: () => ({ isSuperAdmin: false }),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: null, profile: null, signOut: () => {} }),
}))

import { AdminShell } from "@/components/admin/shell/admin-shell"

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
})

function scrollContainer(): HTMLElement {
  const { container } = render(
    <AdminShell stores={[]} activeStoreId="" defaultPinned>
      <p>Contenido</p>
    </AdminShell>,
  )

  const scroller = container.querySelector<HTMLElement>(".overflow-y-auto")
  if (!scroller) throw new Error("El scroller del admin no se renderizó")
  return scroller
}

// jsdom no calcula box model, así que la geometría (que el documento no
// scrollee) se mide fuera de aquí, en Chromium. Lo que sí se puede blindar es el
// contrato del que depende esa geometría: Radix monta los controles nativos
// ocultos de Select y Checkbox como `position: absolute`, y sin un ancestro
// posicionado su bloque contenedor pasa a ser el ICB. Entonces escapan del
// recorte del scroller y estiran el scroll del documento hasta el alto del
// contenido, que es el doble scroll que ve el operador.
describe("el scroller del admin es bloque contenedor", () => {
  it("posiciona el contenedor que recorta el contenido", () => {
    expect(scrollContainer().className).toContain("relative")
  })
})
