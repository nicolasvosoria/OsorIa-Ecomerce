'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { XIcon } from 'lucide-react'
import { Collection, Product } from '@/lib/commerce/types'
import { formatPrice } from '@/lib/commerce/utils'
import { DEFAULT_SHOP_CONFIG, type ShopConfig } from '@/lib/shop/shop-config'
import { cn } from '@/lib/utils'
import { useAvailableColors } from '../hooks/use-available-colors'
import { useKindFilter, useOnSaleFilter, usePriceRange } from '../hooks/use-shop-filters'

interface ActiveFilterChipsProps {
  collections: Collection[]
  products: Product[]
  config?: ShopConfig
  className?: string
}

export function ActiveFilterChips({
  collections,
  products,
  config = DEFAULT_SHOP_CONFIG,
  className,
}: ActiveFilterChipsProps) {
  const params = useParams<{ collection: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isCombo, setKind } = useKindFilter()
  const { isOnSale, setOnSale } = useOnSaleFilter()
  const { priceMin, priceMax, hasPriceFilter, clearPriceRange } = usePriceRange()
  const { selectedColors, toggleColor } = useAvailableColors(products)

  // A hidden filter (config.filters.<key> === false) never contributes a
  // chip, even when its URL param is still set — it no longer affects results.
  const category = config.filters.category
    ? collections.find((collection) => collection.handle === params.collection)
    : undefined
  const showCombo = config.filters.tipo && isCombo
  const showOnSale = config.filters.enOferta && isOnSale
  const showPrice = config.filters.price && hasPriceFilter
  const colors = config.filters.color ? selectedColors : []

  const hasAnyFilter = Boolean(category) || showCombo || showOnSale || showPrice || colors.length > 0

  if (!hasAnyFilter) return null

  const query = searchParams.toString()
  const removeCategory = () => router.push(query ? `/shop?${query}` : '/shop')

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {category && (
        <FilterChip label={`Categoría: ${category.title}`} onRemove={removeCategory} />
      )}
      {showCombo && <FilterChip label="Solo combos" onRemove={() => setKind('all')} />}
      {showOnSale && <FilterChip label="En oferta" onRemove={() => setOnSale(false)} />}
      {showPrice && (
        <FilterChip label={priceChipLabel(priceMin, priceMax)} onRemove={clearPriceRange} />
      )}
      {colors.map((color) => (
        <FilterChip key={color.key} label={color.label} onRemove={() => toggleColor(color)} />
      ))}
      <Link
        href="/shop"
        className="ml-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Limpiar filtros
      </Link>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--button-radius)] border border-border bg-muted px-2.5 py-1 text-sm">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro: ${label}`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}

function priceChipLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatPrice(min)} – ${formatPrice(max)}`
  if (min !== null) return `Desde ${formatPrice(min)}`
  return `Hasta ${formatPrice(max ?? 0)}`
}
