import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/commerce/utils"
import { authorizeSuperAdmin } from "@/lib/supabase/active-store"
import { listStoreOwners, type StoreMember } from "@/lib/supabase/memberships-api"
import {
  getTenantById,
  getTenantDetail,
  type CartStatus,
  type OrderStatus,
  type PaymentStatus,
  type TenantDetail,
  type TenantSummary,
} from "@/lib/supabase/stores-admin-api"
import { DeleteTenantButton } from "../components/delete-tenant-button"
import { ResetOwnerCredentialButton } from "../components/reset-owner-credential-button"
import { TenantActiveToggle } from "../components/tenant-active-toggle"
import { TenantSettingsForm } from "../components/tenant-settings-form"
import { TenantStatusBadges } from "../components/tenant-status-badges"

type TenantDetailPageProps = {
  params: Promise<{ id: string }>
}

// The per-store health view (D6): every section below is an aggregate or a
// boolean, never customer data — see stores-admin-api.ts's getTenantDetail
// for the PII guard itself.
export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    redirect("/admin/stores")
  }

  const { id } = await params
  const tenant = await getTenantById(id)
  if (!tenant) {
    notFound()
  }

  const detail = await getTenantDetail(id)
  const owners = await listStoreOwners(id)

  return (
    <AdminPageContainer>
      <TenantDetailHeader tenant={tenant} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OrdersByStatusCard counts={detail.ordersByStatus} />
        <PaymentsCard detail={detail} currencyCode={tenant.currency_code} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CatalogCard detail={detail} />
        <CartsCard counts={detail.cartsByStatus} />
        <TeamCard memberCount={detail.memberCount} />
        <ThemeCard detail={detail} />
      </div>

      <ManagementSection tenant={tenant} owners={owners} />
    </AdminPageContainer>
  )
}

// D7: the tenant-lifecycle actions (suspend/reactivate, edit name/currency,
// soft-delete) plus the owner-credential reset, gated by the same super_admin
// authority as the rest of this page. The table keeps its own actions unchanged.
function ManagementSection({ tenant, owners }: { tenant: TenantSummary; owners: StoreMember[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestión de la tienda</CardTitle>
          <CardDescription>Disponibilidad y datos básicos de la tienda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Estado operativo</p>
              <p className="text-xs text-muted-foreground">
                {tenant.is_active
                  ? "El dominio de la tienda está disponible"
                  : "El dominio de la tienda está suspendido"}
              </p>
            </div>
            <TenantActiveToggle
              storeId={tenant.id}
              storeName={tenant.store_name}
              isActive={tenant.is_active}
            />
          </div>

          <Separator />

          <TenantSettingsForm
            storeId={tenant.id}
            storeName={tenant.store_name}
            currencyCode={tenant.currency_code}
          />
        </CardContent>
      </Card>

      <OwnerCredentialCard storeId={tenant.id} owners={owners} />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona de peligro</CardTitle>
          <CardDescription>Elimina la tienda de esta consola de forma permanente</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteTenantButton
            storeId={tenant.id}
            storeName={tenant.store_name}
            subdomain={tenant.subdomain}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// D7: support without membership — the reset only ever targets the store's
// single owner, resolved server-side. Zero or several owners: the card says so
// and offers nothing (no owner picker today).
function OwnerCredentialCard({ storeId, owners }: { storeId: string; owners: StoreMember[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Soporte al dueño</CardTitle>
        <CardDescription>Restablece la contraseña del dueño sin entrar a la tienda</CardDescription>
      </CardHeader>
      <CardContent>
        {owners.length === 1 ? (
          <ResetOwnerCredentialButton storeId={storeId} ownerEmail={owners[0].email} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {owners.length === 0
              ? "La tienda no tiene ningún miembro con rol de dueño."
              : "La tienda tiene más de un dueño; esta acción requiere exactamente uno."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function TenantDetailHeader({ tenant }: { tenant: TenantSummary }) {
  return (
    <AdminPageHeader
      title={tenant.store_name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span>{tenant.subdomain}</span>
          <TenantStatusBadges isActive={tenant.is_active} isPublic={tenant.is_public} />
          <span>Creada {formatDate(tenant.created_at)}</span>
          <span>{tenant.currency_code}</span>
        </span>
      }
      actions={
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/admin/stores">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Volver a tiendas</span>
          </Link>
        </Button>
      }
    />
  )
}

function OrdersByStatusCard({ counts }: { counts: Record<OrderStatus, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pedidos por estado</CardTitle>
        <CardDescription>Distribución de todos los pedidos de la tienda</CardDescription>
      </CardHeader>
      <CardContent>
        <StatusCountRows labels={ORDER_STATUS_LABELS} counts={counts} />
      </CardContent>
    </Card>
  )
}

function PaymentsCard({
  detail,
  currencyCode,
}: {
  detail: Pick<TenantDetail, "ordersByPaymentStatus" | "revenue" | "lastOrderAt">
  currencyCode: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pagos</CardTitle>
        <CardDescription>Estado de pago de los pedidos e ingresos cobrados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">Ingresos (pedidos pagados)</span>
          <span className="text-lg font-bold tabular-nums text-foreground">
            {formatPrice(detail.revenue, currencyCode)}
          </span>
        </div>
        <StatusCountRows labels={PAYMENT_STATUS_LABELS} counts={detail.ordersByPaymentStatus} />
        <p className="text-xs text-muted-foreground">
          Último pedido: {formatDate(detail.lastOrderAt)}
        </p>
      </CardContent>
    </Card>
  )
}

function CatalogCard({
  detail,
}: {
  detail: Pick<TenantDetail, "totalItemCount" | "activeItemCount">
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          Catálogo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {detail.activeItemCount}
        </p>
        <p className="text-xs text-muted-foreground">
          activos de {detail.totalItemCount} productos
        </p>
      </CardContent>
    </Card>
  )
}

function CartsCard({ counts }: { counts: Record<CartStatus, number> }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          Carritos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StatusCountRows labels={CART_STATUS_LABELS} counts={counts} />
      </CardContent>
    </Card>
  )
}

function TeamCard({ memberCount }: { memberCount: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          Equipo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold tabular-nums text-foreground">{memberCount}</p>
        <p className="text-xs text-muted-foreground">
          {memberCount === 1 ? "miembro con acceso" : "miembros con acceso"}
        </p>
      </CardContent>
    </Card>
  )
}

function ThemeCard({
  detail,
}: {
  detail: Pick<TenantDetail, "themeName" | "isThemeCustom" | "hasBranding">
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          Tema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-lg font-bold text-foreground">{detail.themeName ?? "—"}</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant={detail.isThemeCustom ? "outline" : "secondary"}>
            {detail.isThemeCustom ? "Personalizado" : "Preset"}
          </Badge>
          <Badge variant={detail.hasBranding ? "default" : "secondary"}>
            {detail.hasBranding ? "Marca configurada" : "Sin marca"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// Reused by every "count by status" card above: a zero-filled row per known
// status, in the label map's own key order.
function StatusCountRows<T extends string>({
  labels,
  counts,
}: {
  labels: Record<T, string>
  counts: Record<T, number>
}) {
  return (
    <ul className="space-y-1.5">
      {(Object.keys(labels) as T[]).map((status) => (
        <li key={status} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{labels[status]}</span>
          <span className="font-medium tabular-nums text-foreground">{counts[status]}</span>
        </li>
      ))}
    </ul>
  )
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  returned: "Devuelto",
  cancelled: "Cancelado",
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
}

const CART_STATUS_LABELS: Record<CartStatus, string> = {
  active: "Activos",
  abandoned: "Abandonados",
  expired: "Expirados",
}

function formatDate(value: string | null): string {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
