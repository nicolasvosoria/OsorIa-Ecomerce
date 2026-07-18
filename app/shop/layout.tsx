import { Suspense } from 'react'
import { getCollections } from '@/lib/products'
import { getShopConfig } from '@/lib/supabase/shop-config-api'
import { MobileFilters } from './components/mobile-filters'
import { ProductsProvider } from './providers/products-provider'

// Cache is handled via 'use cache' directive in getCollections()
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const collections = await getCollections()
  const config = await getShopConfig()

  return (
    <ProductsProvider>
      <Suspense fallback={null}>
        <MobileFilters collections={collections} config={config} />
      </Suspense>
      <div className="container mx-auto flex flex-col gap-6 px-4 py-5 md:py-10">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </ProductsProvider>
  )
}
