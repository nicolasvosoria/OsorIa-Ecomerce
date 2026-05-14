import { thumbHashToDataURL } from 'thumbhash';
import { Money, ProductCollectionSortKey, ProductSortKey } from './types';

const COP_LOCALE = 'es-CO';

function toNumber(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;

  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Format price utility
export const formatPrice = (price: number | string, currencyCode: string = 'COP'): string => {
  const parsedPrice = toNumber(price) ?? 0;

  return new Intl.NumberFormat(COP_LOCALE, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parsedPrice);
};

export interface ProductPricingVisibility {
  currentPrice: Money;
  compareAtPrice?: Money;
  hasDiscount: boolean;
  savingsAmount?: number;
  discountPercent?: number;
  formattedCurrentPrice: string;
  formattedCompareAtPrice?: string;
  formattedSavings?: string;
  savingsLabel?: string;
}

export function resolveProductPricing(currentPrice: Money, compareAtPrice?: Money): ProductPricingVisibility {
  const currentAmount = toNumber(currentPrice.amount) ?? 0;
  const compareAmount = toNumber(compareAtPrice?.amount);
  const hasDiscount = compareAmount !== null && compareAmount > currentAmount;
  const savingsAmount = hasDiscount ? compareAmount - currentAmount : undefined;
  const discountPercent = hasDiscount && compareAmount > 0
    ? Math.round(((compareAmount - currentAmount) / compareAmount) * 100)
    : undefined;
  const formattedSavings = savingsAmount !== undefined
    ? formatPrice(savingsAmount, currentPrice.currencyCode)
    : undefined;

  return {
    currentPrice,
    compareAtPrice: hasDiscount ? compareAtPrice : undefined,
    hasDiscount,
    savingsAmount,
    discountPercent,
    formattedCurrentPrice: formatPrice(currentAmount, currentPrice.currencyCode),
    formattedCompareAtPrice: hasDiscount && compareAtPrice
      ? formatPrice(compareAmount, compareAtPrice.currencyCode)
      : undefined,
    formattedSavings,
    savingsLabel: formattedSavings && discountPercent !== undefined
      ? `Ahorra ${formattedSavings} (${discountPercent}%)`
      : undefined,
  };
}

export const INVALID_COMPARE_AT_PRICE_NOTICE =
  'El precio anterior debe ser mayor al precio de venta actual para mostrar descuento. Se guardará sin precio tachado.';

export function getAdminCompareAtPriceNotice(basePrice: number | string, compareAtPrice?: number | string): string | null {
  const baseAmount = toNumber(basePrice);
  const compareAmount = toNumber(compareAtPrice);

  if (baseAmount === null || compareAmount === null) return null;

  return compareAmount <= baseAmount ? INVALID_COMPARE_AT_PRICE_NOTICE : null;
}

export function getValidCompareAtPrice(basePrice: number | string, compareAtPrice?: number | string): number | undefined {
  const baseAmount = toNumber(basePrice);
  const compareAmount = toNumber(compareAtPrice);

  if (baseAmount === null || compareAmount === null || compareAmount <= baseAmount) return undefined;

  return compareAmount;
}


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
