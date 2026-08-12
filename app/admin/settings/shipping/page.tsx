import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { translations } from "@/lib/i18n/translations"
import { toSelectableShippingMode, type ShippingMode } from "@/lib/shipping/schemas"
import { getStoreIdentityReadiness, type StoreIdentityReadiness } from "@/lib/stores/identity-readiness"
import { buildWhatsAppLink } from "@/lib/stores/whatsapp-contact"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { loadShippingSettings } from "@/lib/supabase/shipping-settings-api"
import { listShippingZones } from "@/lib/supabase/shipping-zones-api"
import { loadStoreIdentity } from "@/lib/supabase/store-identity-api"
import {
  ShippingContactPendingNotice,
  type ShippingContactPendingReason,
} from "./components/shipping-contact-pending-notice"
import { ShippingModeForm } from "./components/shipping-mode-form"
import { ShippingZonesSection } from "./components/zone-editor"

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
  const [settings, identity, zones] = await Promise.all([
    loadShippingSettings(supabase, storeId),
    loadStoreIdentity(supabase, storeId),
    listShippingZones(supabase, storeId),
  ])
  const readiness = getStoreIdentityReadiness(identity)
  const contactPendingReason = resolveContactPendingReason(settings.mode, readiness, identity.phone)

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader title={copy.settingsTitle} subtitle={copy.settingsSubtitle} />
      {contactPendingReason && <ShippingContactPendingNotice reason={contactPendingReason} />}
      <ShippingModeForm defaultValues={{ mode: toSelectableShippingMode(settings.mode) }} />
      <ShippingZonesSection zones={zones} unmatchedDestinationAction={settings.unmatchedDestinationAction} />
    </AdminPageContainer>
  )
}

// D14/F10: pending only matters for the mode that actually needs the phone --
// an own_rates store missing or breaking it isn't blocked on anything here.
// A9: a phone can be present (so it clears the identity gate) and still be
// unusable for WhatsApp -- same "owner needs to see this" treatment as a
// missing one, distinct copy for what's actually wrong.
function resolveContactPendingReason(
  mode: ShippingMode,
  readiness: StoreIdentityReadiness,
  phone: string | null,
): ShippingContactPendingReason | null {
  if (mode !== "coordinate") return null
  if (readiness.missingFields.includes("phone")) return "missing"
  if (buildWhatsAppLink(phone ?? "") === null) return "invalid"
  return null
}
