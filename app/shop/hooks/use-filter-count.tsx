'use client';

import { useQueryState, parseAsArrayOf, parseAsInteger, parseAsString } from 'nuqs';
import { useParams } from 'next/navigation';

export function useFilterCount() {
  const params = useParams<{ collection: string }>();
  const [color] = useQueryState('fcolor', parseAsArrayOf(parseAsString).withDefault([]));
  const [kind] = useQueryState('kind', parseAsString.withDefault('all'));
  const [oferta] = useQueryState('oferta', parseAsString.withDefault(''));
  const [priceMin] = useQueryState('price_min', parseAsInteger);
  const [priceMax] = useQueryState('price_max', parseAsInteger);

  // Count active filters
  let count = 0;

  // Count color filters
  if (color.length > 0) {
    count += color.length;
  }

  if (kind === 'combo') {
    count += 1;
  }

  if (oferta === '1') {
    count += 1;
  }

  if (priceMin !== null || priceMax !== null) {
    count += 1;
  }

  // Count collection filter (if not on "all" products)
  if (params.collection && params.collection !== undefined) {
    count += 1;
  }

  return count;
}

export function useCategoryFilterCount() {
  const params = useParams<{ collection: string }>();

  // Return 1 if a category is selected, 0 if not
  return params.collection && params.collection !== undefined ? 1 : 0;
}

export function useColorFilterCount() {
  const [color] = useQueryState('fcolor', parseAsArrayOf(parseAsString).withDefault([]));

  // Return the number of selected color filters
  return color.length;
}
