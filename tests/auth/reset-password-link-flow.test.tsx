import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const routerPush = vi.hoisted(() => vi.fn())
const isCurrentUserAdminOrUnverified = vi.hoisted(() => vi.fn())
const verifyOtp = vi.hoisted(() => vi.fn())
const exchangeCodeForSession = vi.hoisted(() => vi.fn())
const setSession = vi.hoisted(() => vi.fn())
const onAuthStateChange = vi.hoisted(() => vi.fn())
const updatePassword = vi.hoisted(() => vi.fn())
const resetPassword = vi.hoisted(() => vi.fn())
const link = vi.hoisted(() => ({ query: new URLSearchParams() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => link.query,
}))

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { verifyOtp, exchangeCodeForSession, setSession, onAuthStateChange },
  }),
}))

vi.mock("@/lib/supabase/auth-api", () => ({ updatePassword, resetPassword }))

vi.mock("@/lib/supabase/permissions-api", () => ({ isCurrentUserAdminOrUnverified }))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import ResetPasswordPage from "@/app/auth/reset-password/page"
import { LanguageProvider } from "@/contexts/language-context"
import { translations } from "@/lib/i18n/translations"

const t = translations.es.passwordReset

function openRecoveryLink(query: string, hash = "") {
  link.query = new URLSearchParams(query)
  window.history.replaceState(null, "", `/auth/reset-password${query ? `?${query}` : ""}${hash}`)

  render(
    <LanguageProvider>
      <ResetPasswordPage />
    </LanguageProvider>,
  )
}

function newPasswordField() {
  return screen.queryByLabelText(t.newPassword)
}

async function findRejectedScreen() {
  return screen.findByRole("heading", { name: t.linkRejected })
}

async function typeNewPassword({
  password = "clave-nueva-larga",
  confirmation = password,
}: { password?: string; confirmation?: string } = {}) {
  fireEvent.change(await screen.findByLabelText(t.newPassword), { target: { value: password } })
  fireEvent.change(screen.getByLabelText(translations.es.auth.confirmPassword), {
    target: { value: confirmation },
  })
  fireEvent.click(screen.getByRole("button", { name: translations.es.auth.resetPassword }))
}

function describedByText(control: HTMLElement): string[] {
  const ids = control.getAttribute("aria-describedby")?.split(" ") ?? []
  return ids.map((id) => document.getElementById(id)?.textContent ?? "")
}

async function completeRecovery(query = "token_hash=hash-del-correo&type=recovery") {
  openRecoveryLink(query)
  await typeNewPassword()
  await screen.findByRole("heading", { name: t.updated })
}

describe("reset password link flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyOtp.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
    exchangeCodeForSession.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
    updatePassword.mockResolvedValue({ success: true })
    resetPassword.mockResolvedValue({ success: true })
    isCurrentUserAdminOrUnverified.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // D7: el link que el producto quiere emitir es device-independent, así que la
  // página tiene que canjearlo con verifyOtp y no con el intercambio PKCE.
  it("verifies a token_hash link and lets the owner type a new password", async () => {
    openRecoveryLink("token_hash=hash-del-correo&type=recovery")

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith({
        token_hash: "hash-del-correo",
        type: "recovery",
      })
    })
    expect(await screen.findByLabelText(t.newPassword)).toBeInTheDocument()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  // La plantilla de correo sigue emitiendo `?code` hasta que el operador la
  // cambie en el panel de Supabase: sin esta rama la recuperación queda rota
  // entre el despliegue y ese paso manual.
  it("exchanges a ?code link and lets the owner type a new password", async () => {
    openRecoveryLink("code=codigo-pkce")

    await waitFor(() => {
      expect(exchangeCodeForSession).toHaveBeenCalledWith("codigo-pkce")
    })
    expect(await screen.findByLabelText(t.newPassword)).toBeInTheDocument()
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it("rejects a link that carries no recovery data and offers requesting another", async () => {
    openRecoveryLink("")

    expect(await findRejectedScreen()).toBeInTheDocument()
    expect(screen.getByText(t.linkMissing)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: t.requestNewLink })).toBeInTheDocument()
    expect(newPasswordField()).not.toBeInTheDocument()
  })

  it("surfaces the auth error when the token is expired or already used", async () => {
    verifyOtp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Email link is invalid or has expired" },
    })

    openRecoveryLink("token_hash=hash-gastado&type=recovery")

    expect(await findRejectedScreen()).toBeInTheDocument()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email link is invalid or has expired",
    )
    expect(screen.getByText(t.linkExpired)).toBeInTheDocument()
    expect(newPasswordField()).not.toBeInTheDocument()
  })

  it("opens the recovery dialog in place instead of dead-ending on the rejection", async () => {
    openRecoveryLink("")

    fireEvent.click(await screen.findByRole("button", { name: t.requestNewLink }))

    expect(
      await screen.findByRole("heading", { name: translations.es.header.forgotPasswordTitle }),
    ).toBeInTheDocument()
  })

  // El hash implícito (#access_token) era el ÚNICO camino que leía esta página y
  // ningún link que este proyecto pueda emitir llega así. Se borró a propósito:
  // esta prueba existe para que nadie lo resucite sin darse cuenta.
  it("gives the legacy implicit hash no special path", async () => {
    openRecoveryLink("", "#access_token=token-legado&refresh_token=refresco&type=recovery")

    expect(await findRejectedScreen()).toBeInTheDocument()
    expect(setSession).not.toHaveBeenCalled()
    expect(onAuthStateChange).not.toHaveBeenCalled()
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(newPasswordField()).not.toBeInTheDocument()
  })

  it("updates the password and shows the confirmation screen", async () => {
    openRecoveryLink("token_hash=hash-del-correo&type=recovery")

    await typeNewPassword()

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledWith("clave-nueva-larga")
    })
    expect(await screen.findByRole("heading", { name: t.updated })).toBeInTheDocument()
    expect(newPasswordField()).not.toBeInTheDocument()
  })

  it("keeps the owner on the form with the reason when the update fails", async () => {
    updatePassword.mockResolvedValue({ success: false, error: "New password should be different" })

    openRecoveryLink("token_hash=hash-del-correo&type=recovery")

    await typeNewPassword()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "New password should be different",
    )
    expect(screen.queryByRole("heading", { name: t.updated })).not.toBeInTheDocument()
  })
})

// El bucle que esta pantalla tenía que romper: el dueño encerrado sale del aviso
// de tienda sin publicar, recupera su clave y el proxy lo devolvía al mismo
// aviso, ya con sesión pero sin ninguna puerta visible hacia /admin.
describe("reset password exit destination", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyOtp.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
    updatePassword.mockResolvedValue({ success: true })
    isCurrentUserAdminOrUnverified.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("offers the console, never the root, to whoever can administer a store", async () => {
    await completeRecovery()

    expect(screen.getByRole("link", { name: t.goToConsole })).toHaveAttribute("href", "/admin")
    expect(
      screen.queryAllByRole("link").map((exit) => exit.getAttribute("href")),
    ).not.toContain("/")
  })

  it("leaves someone with no console on the storefront root", async () => {
    isCurrentUserAdminOrUnverified.mockResolvedValue(false)

    await completeRecovery()

    expect(screen.getByRole("link", { name: t.goHome })).toHaveAttribute("href", "/")
  })

  // El link del correo lo emite `resetPassword` sin `next`, pero la plantilla de
  // Supabase la edita el operador: si un día trae uno, se honra por el mismo
  // guard de open redirect que usa el login, no por una segunda regla.
  it("honors a next that survives the open redirect guard", async () => {
    await completeRecovery("token_hash=hash-del-correo&type=recovery&next=%2Fadmin%2Fsettings")

    expect(screen.getByRole("link", { name: t.goToConsole })).toHaveAttribute(
      "href",
      "/admin/settings",
    )
  })

  it("refuses a next that points outside the console", async () => {
    await completeRecovery("token_hash=hash-del-correo&type=recovery&next=https%3A%2F%2Fevil.example")

    expect(screen.getByRole("link", { name: t.goToConsole })).toHaveAttribute("href", "/admin")
  })

  // WCAG 2.2.1: la confirmación ya no arrastra a nadie a ninguna parte pasado un
  // plazo que no se puede detener; la salida es un enlace que se toma o no.
  it("moves nobody off the confirmation on its own", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    await completeRecovery()
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(routerPush).not.toHaveBeenCalled()
  })

  // Sin sesión con la que decidir un destino, la salida del rechazo es el login:
  // "/" en el subdominio de una tienda sin publicar es el aviso del que se venía.
  it("sends a rejected link back to sign in instead of the notice", async () => {
    openRecoveryLink("")

    await findRejectedScreen()

    expect(
      screen.getByRole("link", { name: translations.es.header.backToLogin }),
    ).toHaveAttribute("href", "/auth/login")
    expect(
      screen.queryAllByRole("link").map((exit) => exit.getAttribute("href")),
    ).not.toContain("/")
  })
})

// El toast sale arriba a la izquierda y se va solo: quien trabaja ampliado sobre
// el botón de enviar nunca lo ve, y el campo en falta no quedaba señalado.
describe("reset password field errors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyOtp.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
    updatePassword.mockResolvedValue({ success: true })
    isCurrentUserAdminOrUnverified.mockResolvedValue(true)
  })

  it("marks the confirmation invalid and describes why when the passwords differ", async () => {
    openRecoveryLink("token_hash=hash-del-correo&type=recovery")

    await typeNewPassword({ password: "clave-nueva-larga", confirmation: "otra-clave-larga" })

    const confirmation = screen.getByLabelText(translations.es.auth.confirmPassword)
    await waitFor(() => expect(confirmation).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(confirmation)).toContain(translations.es.header.passwordsDoNotMatch)
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it("marks the new password invalid and describes why when it is too short", async () => {
    openRecoveryLink("token_hash=hash-del-correo&type=recovery")

    await typeNewPassword({ password: "corta" })

    const password = screen.getByLabelText(t.newPassword)
    await waitFor(() => expect(password).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(password)).toContain(translations.es.header.passwordMinLength)
  })

  // La restricción nativa del campo es la primera barrera, pero el envío puede
  // llegar por otras vías (Enter en un navegador permisivo, autofill vacío), y
  // ahí el aviso tiene que quedarse en el campo que falta.
  it("blames only the empty field when one of the two is missing", async () => {
    openRecoveryLink("token_hash=hash-del-correo&type=recovery")

    const password = await screen.findByLabelText(t.newPassword)
    fireEvent.change(password, { target: { value: "clave-nueva-larga" } })
    fireEvent.submit(password.closest("form")!)

    const confirmation = screen.getByLabelText(translations.es.auth.confirmPassword)
    await waitFor(() => expect(confirmation).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(confirmation)).toContain(
      translations.es.header.incompleteFieldsDescription,
    )
    expect(password).not.toHaveAttribute("aria-invalid")
  })
})
