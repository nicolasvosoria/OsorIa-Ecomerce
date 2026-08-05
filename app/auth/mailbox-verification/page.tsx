import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { getSupabaseServiceClient } from "@/lib/supabase/admin-store"
import { confirmStoreMailboxVerification } from "@/lib/supabase/store-identity-api"
import type { MailboxVerificationField } from "@/lib/stores/schemas"

const FIELD_LABELS: Record<MailboxVerificationField, string> = {
  reply_to: "correo de respuesta",
  order_mailbox: "buzón de pedidos",
}

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
          <h1 className="font-semibold text-2xl tracking-tight">
            {result.ok ? "Correo confirmado" : "Enlace no válido"}
          </h1>
          <CardDescription>
            {result.ok
              ? `Este correo ya puede usarse como ${FIELD_LABELS[result.field]} de la tienda.`
              : "Este enlace ya expiró, ya se usó o no es válido. Solicita uno nuevo desde Configuración."}
          </CardDescription>
        </CardHeader>
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
