import { Badge } from "@/components/ui/badge"

// Shared by the tenants table and the detail page header, so the two
// operational flags (is_active/is_public) never drift into two different
// badge wordings. A <span> wrapper, not a <div>: the detail page nests this
// inside AdminPageHeader's <p> subtitle, where a block element is invalid HTML.
export function TenantStatusBadges({
  isActive,
  isPublic,
}: {
  isActive: boolean
  isPublic: boolean
}) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Activa" : "Inactiva"}</Badge>
      <Badge variant={isPublic ? "outline" : "secondary"}>{isPublic ? "Pública" : "Privada"}</Badge>
    </span>
  )
}
