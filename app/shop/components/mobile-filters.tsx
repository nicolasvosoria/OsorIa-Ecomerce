'use client'

import React from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collection } from '@/lib/commerce/types'
import { DEFAULT_SHOP_CONFIG, type ShopConfig } from '@/lib/shop/shop-config'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { CategoryFilter } from './category-filter'
import { ColorFilter } from './color-filter'
import { ComboFilter } from './combo-filter'
import { OnSaleFilter } from './on-sale-filter'
import { PriceFilter } from './price-filter'
import { useFilterCount } from '../hooks/use-filter-count'
import { useProducts } from '../providers/products-provider'
import { useEffectiveShopConfig } from '../hooks/use-effective-shop-config'
import { ResultsCount } from './results-count'
import { SortDropdown } from './sort-dropdown'
import Link from 'next/link'

interface MobileFiltersProps {
  collections: Collection[]
  config?: ShopConfig
  className?: string
}

export function MobileFilters({ collections, config = DEFAULT_SHOP_CONFIG, className }: MobileFiltersProps) {
  const filterCount = useFilterCount()
  const { loadedProducts, total } = useProducts()
  const effectiveConfig = useEffectiveShopConfig(config)

  return (
    <div className="bg-background pt-4 md:hidden overflow-x-clip">
      <Drawer>
        {/* 3 main items: Filters, Results count, Sort by */}
        <div className="grid grid-cols-3 items-center px-4 py-3">
          {/* Filters */}
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start gap-1.5 rounded-[var(--button-radius)] font-medium"
            >
              <SlidersHorizontalIcon className="size-3.5" />
              Filtros
              {filterCount > 0 && <span className="text-muted-foreground">({filterCount})</span>}
            </Button>
          </DrawerTrigger>

          {/* Results count */}
          <ResultsCount count={total} />

          {/* Sort by */}
          {effectiveConfig.filters.sort && <SortDropdown className="justify-self-end" />}
        </div>

        {/* Drawer content */}
        <DrawerContent className={cn('h-[80vh]', className)}>
          <DrawerHeader className="flex justify-between items-center">
            <DrawerTitle className="font-heading text-xl font-normal">
              Filtros{' '}
              {filterCount > 0 && <span className="text-muted-foreground">({filterCount})</span>}
            </DrawerTitle>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                'font-medium text-muted-foreground hover:text-foreground transition-opacity',
                filterCount === 0 && 'opacity-0 pointer-events-none'
              )}
              disabled={filterCount === 0}
              asChild={filterCount > 0}
            >
              <Link href="/shop" prefetch>
                Limpiar
              </Link>
            </Button>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-6">
            {effectiveConfig.filters.category && <CategoryFilter collections={collections} />}
            {effectiveConfig.filters.tipo && <ComboFilter />}
            {effectiveConfig.filters.enOferta && <OnSaleFilter />}
            {effectiveConfig.filters.price && <PriceFilter />}
            {effectiveConfig.filters.color && <ColorFilter products={loadedProducts} />}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
