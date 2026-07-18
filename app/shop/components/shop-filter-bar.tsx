'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ChevronDownIcon } from 'lucide-react'
import { Collection, Product } from '@/lib/commerce/types'
import { DEFAULT_SHOP_CONFIG, type ShopConfig } from '@/lib/shop/shop-config'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAvailableColors } from '../hooks/use-available-colors'
import { COMBO_KIND, useKindFilter, useOnSaleFilter, usePriceRange } from '../hooks/use-shop-filters'
import { PriceRangeFields } from './price-range-fields'
import { ResultsCount } from './results-count'
import { SortDropdown } from './sort-dropdown'

interface ShopFilterBarProps {
  collections: Collection[]
  products: Product[]
  resultCount: number
  config?: ShopConfig
  className?: string
}

export function ShopFilterBar({
  collections,
  products,
  resultCount,
  config = DEFAULT_SHOP_CONFIG,
  className,
}: ShopFilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {config.filters.category && <CategoryMenu collections={collections} />}
        {config.filters.tipo && <KindMenu />}
        {config.filters.price && <PriceMenu />}
        {config.filters.color && <ColorMenu products={products} />}
        {config.filters.enOferta && <OnSaleToggle />}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ResultsCount count={resultCount} />
        {config.filters.sort && <SortDropdown />}
      </div>
    </div>
  )
}

function CategoryMenu({ collections }: { collections: Collection[] }) {
  const params = useParams<{ collection: string }>()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const querySuffix = query ? `?${query}` : ''

  const active = collections.find((collection) => collection.handle === params.collection)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClass(Boolean(active))}>
          {active ? active.title : 'Categoría'}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuItem asChild>
          <Link href={`/shop${querySuffix}`}>Todas las categorías</Link>
        </DropdownMenuItem>
        {collections.map((collection) => (
          <DropdownMenuItem key={collection.handle} asChild>
            <Link href={`/shop/${collection.handle}${querySuffix}`}>{collection.title}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function KindMenu() {
  const { isCombo, setKind } = useKindFilter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClass(isCombo)}>
          {isCombo ? 'Solo combos' : 'Tipo'}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuItem onSelect={() => setKind('all')}>Todos los productos</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setKind(COMBO_KIND)}>Solo combos</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PriceMenu() {
  const { hasPriceFilter } = usePriceRange()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClass(hasPriceFilter)}>
          Precio
          {hasPriceFilter && <span className="size-1.5 rounded-full bg-primary" />}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <PriceRangeFields />
      </PopoverContent>
    </Popover>
  )
}

function ColorMenu({ products }: { products: Product[] }) {
  const { availableColors, selectedColors, toggleColor } = useAvailableColors(products)

  if (availableColors.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClass(selectedColors.length > 0)}>
          Color
          {selectedColors.length > 0 && (
            <span className="text-xs text-muted-foreground">({selectedColors.length})</span>
          )}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <ColorPicker colors={availableColors} selectedColors={selectedColors} onColorChange={toggleColor} />
      </PopoverContent>
    </Popover>
  )
}

function OnSaleToggle() {
  const { isOnSale, toggleOnSale } = useOnSaleFilter()

  return (
    <Button
      type="button"
      size="sm"
      variant={isOnSale ? 'default' : 'outline'}
      onClick={toggleOnSale}
      aria-pressed={isOnSale}
      className={cn('rounded-[var(--button-radius)] font-medium', !isOnSale && 'text-muted-foreground')}
    >
      En oferta
    </Button>
  )
}

function triggerClass(active: boolean) {
  return cn(
    'gap-1.5 rounded-[var(--button-radius)] font-medium',
    active ? 'border-foreground text-foreground' : 'text-muted-foreground',
  )
}
