'use client'

import { useAdmin } from '@/contexts/admin-context'
import { useHasHydrated } from '@/lib/hooks/use-has-hydrated'
import { isThemePreviewMode } from '@/lib/theme-font/preview-mode'
import type { ShopConfig } from '@/lib/shop/shop-config'

// Outside the `?themePreview=1` customizer iframe this always returns
// `serverConfig` unchanged — same as today's /shop. Inside it, a config
// pushed over postMessage (`previewShopConfig`, set by AdminContext's
// listener) overlays it live, mirroring how `HomeComposition` overlays
// `previewComposition`.
export function useEffectiveShopConfig(serverConfig: ShopConfig): ShopConfig {
  const { previewShopConfig } = useAdmin()
  const hasHydrated = useHasHydrated()
  const isPreviewMode = hasHydrated && isThemePreviewMode()

  return isPreviewMode && previewShopConfig ? previewShopConfig : serverConfig
}
