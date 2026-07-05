import { thumbHashToDataURL } from 'thumbhash';
import {
  formatCommercePrice,
  getAdminCompareAtPriceNotice,
  getValidCompareAtPrice,
  resolveCommercePrice,
} from '@/lib/products/pricing';
import type { Money } from './types';
import { ProductCollectionSortKey, ProductSortKey } from './types';

// Format price utility
export const formatPrice = (price: number | string, currencyCode: string = 'COP'): string =>
  formatCommercePrice(price, currencyCode);

export function resolveProductPricing(currentPrice: Money, compareAtPrice?: Money) {
  return resolveCommercePrice({
    amount: currentPrice.amount,
    currencyCode: currentPrice.currencyCode,
    compareAtAmount: compareAtPrice?.amount,
  });
}

export {
  getAdminCompareAtPriceNotice,
  getValidCompareAtPrice,
};

// Helper for returning the expected error state to actions instead of throwing.
export const handleFormActionError = (error: unknown, defaultMessage: string) => {
  return {
    errors: {
      formErrors: [(error as Error)?.message || defaultMessage],
    },
  };
};

// Thumbhash utilities
export function thumbhashToDataURL(thumbhash: string): string {
  try {
    // Convert base64 thumbhash to Uint8Array
    const thumbhashData = Uint8Array.from(atob(thumbhash), c => c.charCodeAt(0));

    // Convert thumbhash to data URL
    return thumbHashToDataURL(thumbhashData);
  } catch (error) {
    console.error('Error converting thumbhash to data URL:', error);
    return '';
  }
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

export const getShopifyProductId = (gid: string) => {
  return gid.split('/').pop() || '';
};
