/** @vitest-environment jsdom */
import type { AnchorHTMLAttributes } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: { value: new Headers() },
}))

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.value,
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import StoreInactive from "@/app/store-inactive/page"
import StoreNotFound from "@/app/store-not-found/page"

const STORE_NAME_HEADER = "x-store-name"
const STORE_NAME = "Cumbre Dorada Café"

// El parámetro de intención de retorno del repo (`next`, normalizado por
// `normalizeAuthReturnPath`), codificado como lo emite `URLSearchParams`.
const OWNER_LOGIN_HREF = "/auth/login?next=%2Fadmin%2Fsettings"

function renderedHrefs() {
  return screen.queryAllByRole("link").map((link) => link.getAttribute("href"))
}

// Los dos avisos son la única pantalla que ve quien llega a una tienda sin
// publicar o a un subdominio vacío: cada salida que ofrezcan tiene que existir
// de verdad. El proxy reescribe `/` y `/shop` a estos mismos avisos, así que un
// enlace a cualquiera de los dos es un bucle, y "otras tiendas" además delataría
// a la plataforma ante un cliente que cree estar en una sola tienda.
describe("Store notice pages", () => {
  beforeEach(() => {
    requestHeaders.value = new Headers()
  })

  describe("/store-inactive", () => {
    it("offers the owner the login link that returns to the publication panel", async () => {
      render(await StoreInactive())

      const ownerLink = screen.getByRole("link")
      expect(ownerLink).toHaveAttribute("href", OWNER_LOGIN_HREF)
    })

    it("offers no other way out, because the proxy rewrites both back here", async () => {
      render(await StoreInactive())

      expect(renderedHrefs()).not.toContain("/")
      expect(renderedHrefs()).not.toContain("/shop")
      expect(renderedHrefs()).toEqual([OWNER_LOGIN_HREF])
    })

    // El enlace del dueño se distingue del párrafo de arriba solo por
    // `--primary`, que elige cada tienda: con el preset Minimal oscuro `primary`
    // y `foreground` valen lo mismo, así que sin subrayado en reposo la única
    // entrada al producto se vuelve invisible.
    it("underlines the owner link at rest instead of relying on the tenant color", async () => {
      render(await StoreInactive())

      expect(screen.getByRole("link").className).toMatch(/(^|\s)underline(\s|$)/)
    })

    it("names the store it is standing in for when the proxy sends its identity", async () => {
      requestHeaders.value = new Headers({ [STORE_NAME_HEADER]: STORE_NAME })

      render(await StoreInactive())

      expect(screen.getByText(new RegExp(STORE_NAME))).toBeInTheDocument()
    })

    // Un header HTTP solo transporta ASCII: el transporte que lleva los headers
    // de petición del proxy a la función que renderiza codifica en UTF-8
    // porcentual cada byte no ASCII, así que el aviso llegó a producción
    // enseñándole "Cumbre Dorada Caf%C3%A9" al cliente. Casi todo nombre de
    // tienda en español lleva tilde o ñ, así que el defecto alcanzaba a casi
    // todas.
    it("names a store with accents without leaking the percent escapes", async () => {
      requestHeaders.value = new Headers({
        [STORE_NAME_HEADER]: "Cumbre Dorada Caf%C3%A9",
      })

      render(await StoreInactive())

      expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
        `${STORE_NAME} todavía no está abierta`,
      )
      expect(document.body.textContent).not.toContain("%C3%A9")
    })

    it("leaves a store name that needed no encoding exactly as it arrived", async () => {
      requestHeaders.value = new Headers({ [STORE_NAME_HEADER]: "NiCoffe" })

      render(await StoreInactive())

      expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
        "NiCoffe todavía no está abierta",
      )
    })

    // Un `%` literal en el nombre viaja sin codificar y hace lanzar a
    // `decodeURIComponent`: el aviso es la página que existe para cuando algo va
    // mal, así que no puede ser ella la que se caiga.
    it("still names the store when the value is not a valid encoding", async () => {
      requestHeaders.value = new Headers({ [STORE_NAME_HEADER]: "Tienda 100%" })

      render(await StoreInactive())

      expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
        "Tienda 100% todavía no está abierta",
      )
    })

    // El aviso es toda la página: sin un encabezado de nivel 1 un lector de
    // pantalla no tiene dónde aterrizar.
    it("exposes its message as the single level-1 heading of the page", async () => {
      render(await StoreInactive())

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
      expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(/todav[íi]a no/i)
    })

    it("still renders the notice and the owner link with no identity header", async () => {
      render(await StoreInactive())

      expect(screen.getByText(/todav[íi]a no/i)).toBeInTheDocument()
      expect(screen.getByRole("link")).toHaveAttribute("href", OWNER_LOGIN_HREF)
    })

    it("says the store is not open yet instead of claiming a temporary shutdown", async () => {
      render(await StoreInactive())

      expect(screen.getByText(/todav[íi]a no/i)).toBeInTheDocument()
      expect(document.body.textContent).not.toMatch(/desactivad|temporalmente|inactiva/i)
    })
  })

  describe("/store-not-found", () => {
    it("offers no way out at all: there is no store and nothing to log into", () => {
      render(<StoreNotFound />)

      expect(renderedHrefs()).toEqual([])
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("exposes its message as the single level-1 heading of the page", () => {
      render(<StoreNotFound />)

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
      expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(/ninguna tienda/i)
    })

    it("says the address matches no store instead of pointing at other stores", () => {
      render(<StoreNotFound />)

      expect(screen.getAllByText(/ninguna tienda/i).length).toBeGreaterThan(0)
      expect(document.body.textContent).not.toMatch(/otras tiendas|página principal/i)
    })
  })
})
