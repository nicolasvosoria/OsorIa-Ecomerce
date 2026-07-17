import { redirect } from "next/navigation"

import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { ThemeCustomEditor } from "@/components/theme/theme-custom-editor"

// Server gate (D10): a session that cannot manage the ACTIVE store is denied
// here — not merely bounced by a client curtain — so a global super_admin with
// no managing role on the active store is turned away server-side (privilege
// separation). AdminShell renders this route full-bleed (isThemeEditorRoute),
// and the editor reads/writes that same active store, so the two agree.
export default async function AdminThemePage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  return <ThemeCustomEditor />
}
