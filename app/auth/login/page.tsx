"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LogIn, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { PasswordRecoveryDialog } from "@/components/auth/password-recovery-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import {
  FORCE_PASSWORD_CHANGE_PATH,
  getAuthReturnPath,
  resolvePostAuthDestination,
} from "@/lib/auth-return-intent"
import {
  currentUserMustChangePassword,
  isCurrentUserAdminOrUnverified,
} from "@/lib/supabase/permissions-api"

// Login dedicado del auth journey (Plan 12): el host admin no tiene storefront
// (ni por tanto el header con el modal de login), así que el proxy manda aquí
// al guest. La sesión de Supabase es una cookie host-only: debe iniciarse en el
// mismo host donde se va a usar.
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [isPending, startTransition] = useTransition()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      const missingCredentials = "Ingresa tu correo y contraseña"
      // El toast aparece lejos del formulario y se va solo: el mismo mensaje se
      // queda en el campo vacío, que es lo que anuncian aria-invalid y
      // aria-describedby.
      setFieldErrors({
        email: email.trim() ? undefined : missingCredentials,
        password: password ? undefined : missingCredentials,
      })
      toast.error(missingCredentials)
      return
    }

    setFieldErrors({})
    startTransition(async () => {
      const result = await login(email.trim(), password)
      if (!result.success) {
        const rejection = result.error || "Verifica tus credenciales e intenta nuevamente"
        // El rechazo no dice cuál de las dos credenciales falló, así que se
        // queda en la clave: es la que se vuelve a escribir.
        setFieldErrors({ password: rejection })
        toast.error(rejection)
        return
      }

      // Un dueño con clave temporal (D21) cambia su clave antes de cualquier
      // destino, incluso con un `next` válido; el guard de servidor de /admin
      // sigue siendo la red de seguridad.
      if (await currentUserMustChangePassword()) {
        router.push(FORCE_PASSWORD_CHANGE_PATH)
        return
      }

      // El dueño llega aquí desde el aviso de tienda apagada con un `next` a su
      // panel (D4), y `resolvePostAuthDestination` solo lo respeta si pasa el
      // guard de open redirect. Sin `next`, volver a "/" sería un callejón: el
      // proxy reescribe la raíz de una tienda sin publicar al mismo aviso del
      // que viene. Quien puede administrar va a la consola; para el cliente sin
      // consola "/" sigue siendo el destino honesto.
      const canAccessAdmin = await isCurrentUserAdminOrUnverified()
      router.push(resolvePostAuthDestination({
        returnPath: getAuthReturnPath(searchParams),
        canAccessAdmin,
        fallback: canAccessAdmin ? "/admin" : "/",
      }))
    })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          {/* El formulario es toda la página: su título tiene que ser un
              encabezado real para que un lector de pantalla tenga dónde
              aterrizar. `CardTitle` pinta un <div> y no acepta `asChild`, y la
              primitiva se comparte con la consola, así que el <h1> se queda aquí
              con las clases que esa primitiva ya resolvía. */}
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Inicia sesión</h1>
          <CardDescription>
            Ingresa con tu cuenta para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField id="login-email" label="Correo electrónico" error={fieldErrors.email}>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </FormField>
            <FormField id="login-password" label="Contraseña" error={fieldErrors.password}>
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </FormField>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Entrar
            </Button>
          </form>
          {/* En el host admin no hay header de tienda, así que este es el único
              camino de vuelta para quien pierde la clave temporal (D8). Queda
              como acción terciaria: entrar sigue siendo lo principal. */}
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setRecoveryOpen(true)}
            >
              {t.auth.forgotPassword}
            </Button>
          </div>
        </CardContent>
      </Card>
      <PasswordRecoveryDialog
        open={recoveryOpen}
        onOpenChange={setRecoveryOpen}
        onBackToSignIn={() => setRecoveryOpen(false)}
      />
    </div>
  )
}
