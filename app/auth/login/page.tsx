"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth-return-intent"
import { currentUserMustChangePassword } from "@/lib/supabase/permissions-api"

// Login dedicado del auth journey (Plan 12): el host admin no tiene storefront
// (ni por tanto el header con el modal de login), así que el proxy manda aquí
// al guest. La sesión de Supabase es una cookie host-only: debe iniciarse en el
// mismo host donde se va a usar. Tras entrar se navega a `/` y cada host decide
// el destino (en el host admin el proxy la reescribe a la consola, cuyos gates
// de servidor deciden el acceso real).
export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, startTransition] = useTransition()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      toast.error("Ingresa tu correo y contraseña")
      return
    }

    startTransition(async () => {
      const result = await login(email.trim(), password)
      if (!result.success) {
        toast.error(result.error || "Verifica tus credenciales e intenta nuevamente")
        return
      }

      // Un dueño con clave temporal (D21) cambia su clave antes de cualquier
      // destino, igual que en el modal del storefront; el guard de servidor de
      // /admin sigue siendo la red de seguridad.
      const destination = (await currentUserMustChangePassword())
        ? FORCE_PASSWORD_CHANGE_PATH
        : "/"
      router.push(destination)
    })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Inicia sesión</CardTitle>
          <CardDescription>
            Ingresa con tu cuenta para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField id="login-email" label="Correo electrónico">
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
            <FormField id="login-password" label="Contraseña">
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
        </CardContent>
      </Card>
    </div>
  )
}
