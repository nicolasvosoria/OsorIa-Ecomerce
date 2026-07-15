import { type ReactNode } from "react"

import { AdminPageBreadcrumb } from "./page-breadcrumb"

export function AdminPageHeader({
  title,
  subtitle,
  entityLabel,
  actions,
}: {
  title: ReactNode
  subtitle: ReactNode
  entityLabel?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <AdminPageBreadcrumb entityLabel={entityLabel} />
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  )
}
