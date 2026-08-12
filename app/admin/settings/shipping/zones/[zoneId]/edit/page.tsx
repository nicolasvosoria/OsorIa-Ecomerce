import { notFound, redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { translations } from "@/lib/i18n/translations"
import { listDepartments } from "@/lib/shipping/locations-api"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import {
  findMissingWeightProducts,
  listShippingZones,
  type ShippingZoneRecord,
} from "@/lib/supabase/shipping-zones-api"
import { ZoneForm } from "../../../components/zone-form"

const copy = translations.es.shipping.zones

export default async function EditShippingZonePage({
  params,
}: {
  params: Promise<{ zoneId: string }>
}) {
  const { zoneId } = await params
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { supabase, storeId } = authorization
  const [zone, departments, missingWeightProducts] = await Promise.all([
    findStoreZone(zoneId, supabase, storeId),
    listDepartments(supabase),
    findMissingWeightProducts(supabase, storeId),
  ])

  if (!zone) {
    notFound()
  }

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader title={copy.editTitle} subtitle={copy.sectionDescription} />
      <ZoneForm zoneId={zone.id} zone={zone} departments={departments} missingWeightProducts={missingWeightProducts} />
    </AdminPageContainer>
  )
}

async function findStoreZone(
  zoneId: string,
  supabase: any,
  storeId: string,
): Promise<ShippingZoneRecord | null> {
  const zones = await listShippingZones(supabase, storeId)
  return zones.find((zone) => zone.id === zoneId) ?? null
}
