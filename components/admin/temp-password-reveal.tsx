import { Input } from "@/components/ui/input"

// Shown once, right after minting a temporary password for an owner or a
// member: read-only, selects on focus so the admin can copy it in one click.
export function TempPasswordReveal({
  value,
  title,
  recipient,
}: {
  value: string
  title: string
  recipient: string
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">
        Pásasela {recipient}: deberá cambiarla al entrar. No se volverá a mostrar.
      </p>
      <Input readOnly value={value} onFocus={(event) => event.currentTarget.select()} />
    </div>
  )
}
