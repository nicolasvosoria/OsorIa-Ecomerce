'use client'

import { ColorPicker } from '@/components/ui/color-picker'
import { ColorSwatchSkeleton } from '@/components/ui/color-swatch-skeleton'
import { Product } from '@/lib/commerce/types'
import { cn } from '@/lib/utils'
import { useAvailableColors } from '../hooks/use-available-colors'
import { useColorFilterCount } from '../hooks/use-filter-count'

interface ColorFilterProps {
  products?: Product[]
  className?: string
}

export function ColorFilter({ products = [], className }: ColorFilterProps) {
  const { availableColors, selectedColors, toggleColor } = useAvailableColors(products)
  const colorCount = useColorFilterCount()

  const isLoading = products.length === 0

  const atLeastOneColor = availableColors.length > 0

  return (
    (atLeastOneColor || isLoading) && (
      <div className={cn('rounded-card bg-muted p-4 sm:p-5', className)}>
        <h3 className="mb-4 font-heading text-base font-normal">
          Color {colorCount > 0 && <span className="text-muted-foreground">({colorCount})</span>}
        </h3>
        {isLoading ? (
          <ColorSwatchSkeleton count={4} />
        ) : (
          <ColorPicker
            colors={availableColors}
            selectedColors={selectedColors}
            onColorChange={toggleColor}
          />
        )}
      </div>
    )
  )
}
