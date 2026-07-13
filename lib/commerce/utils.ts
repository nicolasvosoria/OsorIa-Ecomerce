import { formatCommercePrice, resolveCommercePrice } from '@/lib/products/pricing';
import type { Money } from './types';
import { ProductCollectionSortKey, ProductSortKey } from './types';

export const formatPrice = (price: number | string, currencyCode: string = 'COP'): string =>
  formatCommercePrice(price, currencyCode);

export function resolveProductPricing(currentPrice: Money, compareAtPrice?: Money) {
  return resolveCommercePrice({
    amount: currentPrice.amount,
    currencyCode: currentPrice.currencyCode,
    compareAtAmount: compareAtPrice?.amount,
  });
}

export function mapSortKeys(
  sortKey: string | undefined,
  type: 'product'
): { sortKey: ProductSortKey; reverse: boolean };
export function mapSortKeys(
  sortKey: string | undefined,
  type: 'collection'
): { sortKey: ProductCollectionSortKey; reverse: boolean };
export function mapSortKeys(
  sortKey: string | undefined,
  type: 'product' | 'collection' = 'product'
): { sortKey: ProductSortKey | ProductCollectionSortKey; reverse: boolean } {
  switch (sortKey) {
    case 'price-asc':
      return { sortKey: 'PRICE', reverse: false };
    case 'price-desc':
      return { sortKey: 'PRICE', reverse: true };
    case 'newest':
      if (type === 'collection') {
        return { sortKey: 'CREATED', reverse: false };
      }
      return { sortKey: 'CREATED_AT', reverse: false };
    case 'oldest':
      if (type === 'collection') {
        return { sortKey: 'CREATED', reverse: true };
      }
      return { sortKey: 'CREATED_AT', reverse: true };
    default:
      return { sortKey: 'RELEVANCE', reverse: false };
  }
}

export const getProductId = (gid: string) => {
  return gid.split('/').pop() || '';
};
