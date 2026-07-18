'use client'

import { Collection } from '@/lib/commerce/types'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCategoryFilterCount } from '../hooks/use-filter-count'

interface CategoryFilterProps {
  collections: Collection[]
  className?: string
}

export function CategoryFilter({ collections, className }: CategoryFilterProps) {
  const params = useParams<{ collection: string }>()
  const searchParams = useSearchParams()
  const hasSelectedCategory = !!params.collection
  const categoryCount = useCategoryFilterCount()

  // Keep the active price/oferta/color/tipo filters when switching category.
  const query = searchParams.toString()
  const querySuffix = query ? `?${query}` : ''

  return (
    <div className={cn('rounded-card bg-muted p-4 sm:p-5', className)}>
      <h3 className="mb-4 font-heading text-base font-normal">
        Categorías{' '}
        {categoryCount > 0 && <span className="text-muted-foreground">({categoryCount})</span>}
      </h3>
      <ul className="flex flex-col gap-1">
        {collections.map((collection, index) => {
          const isSelected = params.collection === collection.handle
          return (
            <li key={`${collection.handle}-${index}`}>
              <Link
                className={cn(
                  'flex w-full text-left transition-all transform cursor-pointer font-sm md:hover:translate-x-1 md:hover:opacity-80',
                  isSelected ? 'font-medium translate-x-1' : hasSelectedCategory ? 'opacity-50' : ''
                )}
                href={`/shop/${collection.handle}${querySuffix}`}
                aria-pressed={isSelected}
                aria-label={`Filtrar por categoría: ${collection.title}`}
                prefetch
              >
                {collection.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
