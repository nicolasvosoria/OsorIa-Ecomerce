'use client'

import { cn } from '@/lib/utils'
import { COMBO_KIND, useKindFilter } from '../hooks/use-shop-filters'

export function ComboFilter({ className }: { className?: string }) {
  const { isCombo, setKind } = useKindFilter()

  return (
    <div className={cn('rounded-card bg-muted p-4 sm:p-5', className)}>
      <h3 className="mb-4 font-heading text-base font-normal">Tipo</h3>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setKind(COMBO_KIND)}
          className={cn(
            'text-left transition-all transform cursor-pointer font-sm md:hover:translate-x-1 md:hover:opacity-80',
            isCombo ? 'font-medium translate-x-1' : '',
          )}
        >
          Solo combos
        </button>
        <button
          type="button"
          onClick={() => setKind('all')}
          className={cn(
            'text-left transition-all transform cursor-pointer font-sm md:hover:translate-x-1 md:hover:opacity-80',
            !isCombo ? 'font-medium translate-x-1' : 'opacity-50',
          )}
        >
          Todos los productos
        </button>
      </div>
    </div>
  )
}
