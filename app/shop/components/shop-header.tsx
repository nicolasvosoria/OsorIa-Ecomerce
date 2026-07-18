'use client'

import { useAdmin } from '@/contexts/admin-context'
import { useComponentStyle } from '@/contexts/styles-context'

export const SHOP_COPY_DEFAULTS = {
  title: '',
  subtitle: '',
}

// Optional /shop header (D6), read the same way other themed sections read
// their copy (see products-grid.tsx's useComponentStyle("products", ...)).
// Empty by default, so an unconfigured store's /shop stays pixel-identical
// to today; an admin sets title/subtitle via component_styles "shop".
export function ShopHeader() {
  const { styles: styleData } = useComponentStyle('shop', SHOP_COPY_DEFAULTS)
  const { componentEdits } = useAdmin()
  const edits = componentEdits.get('shop') || {}
  const { title, subtitle } = { ...SHOP_COPY_DEFAULTS, ...styleData, ...edits }

  if (!title && !subtitle) return null

  return (
    <div className="flex flex-col gap-1">
      {title && <h1 className="font-heading text-2xl font-normal md:text-3xl">{title}</h1>}
      {subtitle && <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>}
    </div>
  )
}
