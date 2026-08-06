import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { resolveServerAuthSession } from "@/lib/supabase/server-auth-session"
import { AcceptMembershipCard } from "./accept-membership-card"

// D21: reached from the membership-acceptance email. Requires the SAME
// authenticated identity the invite named -- accept-membership-card.tsx's
// server action re-checks that server-side, this page only decides whether
// there is a session at all to check it against. An anonymous visitor is
// sent to log in and told to reopen this exact link: the return-path
// allow-list (lib/auth-return-intent.ts) only ever trusts /admin
// destinations, and widening that open-redirect guard for one flow is a
// bigger, separate decision than this page needs to make.
export default async function AcceptMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) {
    return <StatusCard title="Enlace no válido" description="Este enlace de invitación no es válido." />
  }

  const session = await resolveServerAuthSession()
  if (!session) {
    return (
      <StatusCard
        title="Inicia sesión para continuar"
        description="Esta invitación es para una cuenta existente. Inicia sesión y vuelve a abrir este mismo enlace."
      >
        <Button asChild className="w-full">
          <Link href="/auth/login">Iniciar sesión</Link>
        </Button>
      </StatusCard>
    )
  }

  return <AcceptMembershipCard token={token} />
}

function StatusCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
    </div>
  )
}
