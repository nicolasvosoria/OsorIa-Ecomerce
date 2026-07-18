'use client'

import { cn } from '@/lib/utils'
import { PriceRangeFields } from './price-range-fields'

export function PriceFilter({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-card bg-muted p-4 sm:p-5', className)}>
      <h3 className="mb-4 font-heading text-base font-normal">Precio</h3>
      <PriceRangeFields />
    </div>
  )
}
