"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { adminBreadcrumbTrail } from "@/lib/admin/routes"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Aislado del resto de AdminPageHeader para que el pathname del cliente no
// arrastre la cabecera entera fuera de los Server Components.
export function AdminPageBreadcrumb({ entityLabel }: { entityLabel?: string }) {
  const pathname = usePathname() ?? ""
  const trail = adminBreadcrumbTrail(pathname, entityLabel)

  if (trail.length === 0) return null

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {trail.map(({ label, href }, index) => (
          <Fragment key={href}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem className="min-w-0">
              {index === trail.length - 1 ? (
                <BreadcrumbPage className="truncate">{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={href}>{label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
