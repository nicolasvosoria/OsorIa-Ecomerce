'use client'

import { useQueryState, useQueryStates, parseAsInteger, parseAsString } from 'nuqs'

// Price and "En oferta" are resolved SERVER-SIDE in getItems, so their URL writes
// must use shallow:false to re-run the RSC. Tipo is filtered client-side on the
// already-loaded set, so it keeps the default shallow behavior.
const SERVER_FILTER_OPTIONS = { shallow: false }

const ON_SALE_VALUE = '1'
export const COMBO_KIND = 'combo'
const ALL_KIND = 'all'

export function usePriceRange() {
  const [range, setRange] = useQueryStates(
    { price_min: parseAsInteger, price_max: parseAsInteger },
    SERVER_FILTER_OPTIONS,
  )

  return {
    priceMin: range.price_min,
    priceMax: range.price_max,
    hasPriceFilter: range.price_min !== null || range.price_max !== null,
    setPriceRange: (min: number | null, max: number | null) =>
      setRange({ price_min: min, price_max: max }),
    clearPriceRange: () => setRange({ price_min: null, price_max: null }),
  }
}

export function useOnSaleFilter() {
  const [oferta, setOferta] = useQueryState(
    'oferta',
    parseAsString.withDefault('').withOptions(SERVER_FILTER_OPTIONS),
  )
  const isOnSale = oferta === ON_SALE_VALUE

  return {
    isOnSale,
    setOnSale: (active: boolean) => setOferta(active ? ON_SALE_VALUE : null),
    toggleOnSale: () => setOferta(isOnSale ? null : ON_SALE_VALUE),
  }
}

export function useKindFilter() {
  const [kind, setKind] = useQueryState('kind', parseAsString.withDefault(ALL_KIND))

  return {
    kind,
    isCombo: kind === COMBO_KIND,
    setKind: (next: string) => setKind(next === ALL_KIND ? null : next),
  }
}
