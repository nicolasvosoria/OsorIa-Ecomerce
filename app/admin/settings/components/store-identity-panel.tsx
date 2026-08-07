"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, CircleDashed, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { requestMailboxVerification, updateStoreIdentityFields } from "@/app/admin/actions/store-identity"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { getStoreIdentityReadiness, type StoreIdentityField } from "@/lib/stores/identity-readiness"
import type { MailboxVerificationField } from "@/lib/stores/schemas"
import type { StoreIdentityView } from "@/lib/supabase/store-identity-api"

const READINESS_FIELD_LABELS: Record<StoreIdentityField, string> = {
  displayName: "Nombre público",
  legalName: "Razón social",
  phone: "Teléfono",
  commercialAddress: "Dirección comercial",
  replyTo: "Correo de respuesta verificado",
  orderMailbox: "Buzón de pedidos verificado",
}

const READINESS_FIELD_ORDER = Object.keys(READINESS_FIELD_LABELS) as StoreIdentityField[]

export function StoreIdentityPanel({ initial }: { initial: StoreIdentityView }) {
  const [identity, setIdentity] = useState(initial)
  const readiness = getStoreIdentityReadiness(identity)

  // A successful send starts verification but never completes it here (the
  // owner confirms from the emailed link), so the panel only ever has a new
  // PENDING address to reflect -- never a freshly verified one (B4).
  const applyPendingEmail = (field: MailboxVerificationField, pendingEmail: string) =>
    setIdentity((current) =>
      field === "reply_to"
        ? { ...current, replyToPendingEmail: pendingEmail }
        : { ...current, orderMailboxPendingEmail: pendingEmail },
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Identidad y correo de la tienda</CardTitle>
        <CardDescription>
          Esta información aparece en los correos que reciben tus clientes y confirma que administras esta tienda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ReadinessChecklist missingFields={readiness.missingFields} />
        <Separator />
        <IdentityFieldsForm
          identity={identity}
          onSaved={(fields) => setIdentity((current) => ({ ...current, ...fields }))}
        />
        <Separator />
        <div className="space-y-4">
          <MailboxVerificationRow
            field="reply_to"
            label="Correo de respuesta"
            description="A dónde llegan las respuestas cuando un cliente contesta un correo de la tienda."
            verifiedEmail={identity.replyToEmail}
            pendingEmail={identity.replyToPendingEmail}
            onVerificationRequested={(pendingEmail) => applyPendingEmail("reply_to", pendingEmail)}
          />
          <MailboxVerificationRow
            field="order_mailbox"
            label="Buzón de pedidos"
            description="El correo operativo de la tienda para las notificaciones de pedidos."
            verifiedEmail={identity.orderMailboxEmail}
            pendingEmail={identity.orderMailboxPendingEmail}
            onVerificationRequested={(pendingEmail) => applyPendingEmail("order_mailbox", pendingEmail)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ReadinessChecklist({ missingFields }: { missingFields: StoreIdentityField[] }) {
  const missing = new Set(missingFields)

  return (
    <ul className="grid gap-2 sm:grid-cols-2" role="status" aria-live="polite">
      {READINESS_FIELD_ORDER.map((field) => {
        const isMissing = missing.has(field)
        return (
          <li key={field} className="flex items-center gap-2 text-sm">
            {isMissing ? (
              <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
            )}
            <span className={isMissing ? "text-muted-foreground" : undefined}>
              {READINESS_FIELD_LABELS[field]}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

type IdentityFieldValues = { legalName: string; phone: string; commercialAddress: string }

function IdentityFieldsForm({
  identity,
  onSaved,
}: {
  identity: StoreIdentityView
  onSaved: (fields: IdentityFieldValues) => void
}) {
  const [fields, setFields] = useState<IdentityFieldValues>({
    legalName: identity.legalName ?? "",
    phone: identity.phone ?? "",
    commercialAddress: identity.commercialAddress ?? "",
  })
  const [isPending, startTransition] = useTransition()

  const editField =
    (field: keyof IdentityFieldValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setFields((current) => ({ ...current, [field]: event.target.value }))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    startTransition(async () => {
      const result = await updateStoreIdentityFields(fields)
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar")
        return
      }

      onSaved(fields)
      toast.success("Identidad de la tienda actualizada")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField id="store-legal-name" label="Razón social">
        {(field) => <Input {...field} value={fields.legalName} onChange={editField("legalName")} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="store-phone" label="Teléfono">
          {(field) => <Input {...field} type="tel" value={fields.phone} onChange={editField("phone")} />}
        </FormField>
        <FormField id="store-address" label="Dirección comercial">
          {(field) => (
            <Input {...field} value={fields.commercialAddress} onChange={editField("commercialAddress")} />
          )}
        </FormField>
      </div>
      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Guardar identidad
      </Button>
    </form>
  )
}

const MAILBOX_FIELD_INPUT_IDS: Record<MailboxVerificationField, string> = {
  reply_to: "store-reply-to",
  order_mailbox: "store-order-mailbox",
}

function MailboxVerificationRow({
  field,
  label,
  description,
  verifiedEmail,
  pendingEmail,
  onVerificationRequested,
}: {
  field: MailboxVerificationField
  label: string
  description: string
  verifiedEmail: string | null
  pendingEmail: string | null
  onVerificationRequested: (pendingEmail: string) => void
}) {
  const [email, setEmail] = useState(pendingEmail ?? verifiedEmail ?? "")
  const [isPending, startTransition] = useTransition()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    startTransition(async () => {
      const result = await requestMailboxVerification({ field, email })
      if (!result.success) {
        toast.error(result.error ?? "No se pudo enviar el enlace de verificación")
        return
      }

      onVerificationRequested(result.pendingEmail)
      toast.success("Enviamos un enlace de verificación a ese correo")
    })
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2" role="status" aria-live="polite">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <MailboxStatusBadge verifiedEmail={verifiedEmail} pendingEmail={pendingEmail} />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <FormField id={MAILBOX_FIELD_INPUT_IDS[field]} label={label} hint={description}>
          {(controlField) => (
            <Input
              {...controlField}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@tutienda.com"
              className="sm:max-w-xs"
            />
          )}
        </FormField>
        <Button type="submit" variant="outline" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar enlace de verificación
        </Button>
      </form>
    </div>
  )
}

function MailboxStatusBadge({
  verifiedEmail,
  pendingEmail,
}: {
  verifiedEmail: string | null
  pendingEmail: string | null
}) {
  if (verifiedEmail) {
    return <Badge variant="default">Verificado</Badge>
  }

  if (pendingEmail) {
    return <Badge variant="secondary">Pendiente de confirmación</Badge>
  }

  return <Badge variant="outline">Sin configurar</Badge>
}
