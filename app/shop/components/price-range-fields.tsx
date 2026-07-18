'use client'

import { FocusEvent, FormEvent, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { usePriceRange } from '../hooks/use-shop-filters'

const DEBOUNCE_MS = 400

export function PriceRangeFields({ className }: { className?: string }) {
  const { priceMin, priceMax, setPriceRange } = usePriceRange()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => clearTimer(timer), [])

  const commit = (form: HTMLFormElement) => {
    const data = new FormData(form)
    setPriceRange(toPriceValue(data.get('price_min')), toPriceValue(data.get('price_max')))
  }

  const debounceCommit = (event: FormEvent<HTMLInputElement>) => {
    const form = event.currentTarget.form
    if (!form) return
    clearTimer(timer)
    timer.current = setTimeout(() => commit(form), DEBOUNCE_MS)
  }

  const commitNow = (event: FocusEvent<HTMLInputElement>) => {
    const form = event.currentTarget.form
    if (!form) return
    clearTimer(timer)
    commit(form)
  }

  return (
    // Uncontrolled inputs seeded from the URL. The popover/drawer that hosts this
    // form unmounts on close, so reopening always reflects the current range and a
    // debounced commit never remounts the fields mid-typing.
    <form onSubmit={(event) => event.preventDefault()} className={cn('flex items-end gap-3', className)}>
      <label className="flex flex-1 flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground">Desde</span>
        <Input
          name="price_min"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="0"
          aria-label="Precio desde"
          defaultValue={priceMin ?? ''}
          onChange={debounceCommit}
          onBlur={commitNow}
        />
      </label>
      <label className="flex flex-1 flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground">Hasta</span>
        <Input
          name="price_max"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Sin límite"
          aria-label="Precio hasta"
          defaultValue={priceMax ?? ''}
          onChange={debounceCommit}
          onBlur={commitNow}
        />
      </label>
    </form>
  )
}

function clearTimer(timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (timer.current) clearTimeout(timer.current)
}

function toPriceValue(raw: FormDataEntryValue | null): number | null {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (text === '') return null
  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}
