import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { translations } from "@/lib/i18n/translations"
import { listDepartments } from "@/lib/shipping/locations-api"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { findMissingWeightProducts } from "@/lib/supabase/shipping-zones-api"
import { ZoneForm } from "../../components/zone-form"

const copy = translations.es.shipping.zones

export default async function CreateShippingZonePage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { supabase, storeId } = authorization
  const [departments, missingWeightProducts] = await Promise.all([
    listDepartments(supabase),
    findMissingWeightProducts(supabase, storeId),
  ])

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader title={copy.createTitle} subtitle={copy.sectionDescription} />
      <ZoneForm zoneId={null} zone={null} departments={departments} missingWeightProducts={missingWeightProducts} />
    </AdminPageContainer>
  )
}
