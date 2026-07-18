'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useOnSaleFilter } from '../hooks/use-shop-filters'

export function OnSaleFilter({ className }: { className?: string }) {
  const { isOnSale, setOnSale } = useOnSaleFilter()

  return (
    <div className={cn('rounded-card bg-muted p-4 sm:p-5', className)}>
      <h3 className="mb-4 font-heading text-base font-normal">En oferta</h3>
      <Label htmlFor="on-sale" className="flex cursor-pointer items-center gap-2 font-normal">
        <Checkbox id="on-sale" checked={isOnSale} onCheckedChange={(checked) => setOnSale(checked === true)} />
        Solo en oferta
      </Label>
    </div>
  )
}
