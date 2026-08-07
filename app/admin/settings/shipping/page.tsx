import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { translations } from "@/lib/i18n/translations"
import { toSelectableShippingMode } from "@/lib/shipping/schemas"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { loadShippingSettings } from "@/lib/supabase/shipping-settings-api"
import { findMissingWeightProducts, listShippingZones } from "@/lib/supabase/shipping-zones-api"
import { ShippingZonesSection } from "./components/zone-editor"
import { ShippingModeForm } from "./components/shipping-mode-form"

const copy = translations.es.shipping

// D13: a dedicated route, not a Configuración panel -- the zones-and-rates
// query a later slice adds must not ride in the settings page, which
// redirects to "/" on any auth failure the same way every other admin
// settings screen does.
export default async function ShippingSettingsPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { supabase, storeId } = authorization
  const settings = await loadShippingSettings(supabase, storeId)
  const [zones, missingWeightProducts] = await Promise.all([
    listShippingZones(supabase, storeId),
    findMissingWeightProducts(supabase, storeId),
  ])

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader title={copy.settingsTitle} subtitle={copy.settingsSubtitle} />
      <ShippingModeForm defaultValues={{ mode: toSelectableShippingMode(settings.mode) }} />
      <ShippingZonesSection
        zones={zones}
        missingWeightProducts={missingWeightProducts}
        unmatchedDestinationAction={settings.unmatchedDestinationAction ?? "block"}
      />
    </AdminPageContainer>
  )
}
