"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, UserPlus, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFocusOnViewChange } from "@/lib/hooks/use-focus-on-view-change"
import { acceptMembershipInviteAction } from "./actions"

type AcceptOutcome = "idle" | "accepted" | "rejected"

// D21: acceptance is an explicit action, never automatic on page load -- the
// button click IS the consent this decision requires.
export function AcceptMembershipCard({ token }: { token: string }) {
  const [outcome, setOutcome] = useState<AcceptOutcome>("idle")
  const [isPending, startTransition] = useTransition()
  const headingRef = useFocusOnViewChange<HTMLHeadingElement>(outcome)

  const accept = () => {
    startTransition(async () => {
      const result = await acceptMembershipInviteAction(token)
      if (result.outcome === "accepted") {
        setOutcome("accepted")
        return
      }
      // "unavailable" says nothing about the token itself (no session,
      // Supabase unreachable, a transport error) -- only a confirmed
      // "invalid" rejection earns the terminal card; anything else keeps the
      // button so the one click D21 requires isn't lost to a network blip.
      if (result.outcome === "invalid") {
        setOutcome("rejected")
      }
      toast.error(result.error)
    })
  }

  if (outcome === "accepted") {
    return (
      <Shell>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle asChild className="text-2xl">
            <h1 ref={headingRef} tabIndex={-1} className="outline-none">
              Acceso activado
            </h1>
          </CardTitle>
          <CardDescription>Ya puedes entrar a administrar la tienda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/admin">Ir a administración</Link>
          </Button>
        </CardContent>
      </Shell>
    )
  }

  if (outcome === "rejected") {
    return (
      <Shell>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle asChild className="text-2xl">
            <h1 ref={headingRef} tabIndex={-1} className="outline-none">
              Enlace no válido
            </h1>
          </CardTitle>
          <CardDescription>Este enlace ya expiró, ya se usó o no es válido. Pide a quien te invitó que te envíe uno nuevo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin">Ir a administración</Link>
          </Button>
        </CardContent>
      </Shell>
    )
  }

  return (
    <Shell>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle asChild className="text-2xl">
          <h1 ref={headingRef} tabIndex={-1} className="outline-none">
            Tienes una invitación
          </h1>
        </CardTitle>
        <CardDescription>Te invitaron a administrar una tienda. Acepta para activar tu acceso.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled={isPending} className="w-full" onClick={accept}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Aceptar invitación
        </Button>
      </CardContent>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" role="status" aria-live="polite">
        {children}
      </Card>
    </div>
  )
}
