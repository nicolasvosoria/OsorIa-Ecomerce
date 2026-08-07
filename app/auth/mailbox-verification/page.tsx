import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminUrl } from "@/lib/email/urls"
import { getSupabaseServiceClient } from "@/lib/supabase/admin-store"
import { confirmStoreMailboxVerification } from "@/lib/supabase/store-identity-api"
import type { MailboxVerificationField } from "@/lib/stores/schemas"

const FIELD_LABELS: Record<MailboxVerificationField, string> = {
  reply_to: "correo de respuesta",
  order_mailbox: "buzón de pedidos",
}

// B9: both branches are dead ends without this -- the owner arrives from an
// email, often on a phone, and can't be expected to know "Configuración"
// means /admin/settings on their own subdomain, let alone type it by hand.
const SETTINGS_URL = getAdminUrl("/admin/settings")

export default async function MailboxVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await resolveConfirmation(token)

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle asChild className="text-2xl">
            <h1>{result.ok ? "Correo confirmado" : "Enlace no válido"}</h1>
          </CardTitle>
          <CardDescription>
            {result.ok
              ? `Este correo ya puede usarse como ${FIELD_LABELS[result.field]} de la tienda.`
              : "Este enlace ya expiró, ya se usó o no es válido. Solicita uno nuevo desde Configuración."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={SETTINGS_URL}>Ir a Configuración</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

async function resolveConfirmation(token: string | undefined) {
  if (!token) {
    return { ok: false as const }
  }

  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    return { ok: false as const }
  }

  return confirmStoreMailboxVerification(supabase, token)
}
