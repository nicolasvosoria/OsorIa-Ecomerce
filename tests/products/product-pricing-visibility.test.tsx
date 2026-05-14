import { describe, expect, it } from 'vitest';
import { adaptSupabaseProduct } from '@/lib/products/adapter';
import { getAdminCompareAtPriceNotice, resolveProductPricing } from '@/lib/shopify/utils';

const baseItem = {
  id: 'item-1',
  item_name: 'Café Especial',
  item_slug: 'cafe-especial',
  item_description: 'Café premium',
  item_description_html: '<p>Café premium</p>',
  item_kind: 'product',
  combo: null,
  category: { id: 'cat-1', category_name: 'Café', category_description: null, updated_at: '2026-05-14' },
  category_id: 'cat-1',
  base_price: 72000,
  currency_code: 'COP',
  compare_at_price: null,
  primary_image_url: '/coffee.jpg',
  primary_image_alt: 'Café Especial',
  images: [],
  options: [],
  variants: [],
  tags: [],
  seo_title: null,
  seo_description: null,
  is_available_for_sale: true,
  is_active: true,
  metadata: {},
} as any;

describe('product pricing visibility projection', () => {
  it('keeps a valid comparison price and exposes uniform COP labels and savings', () => {
    const product = adaptSupabaseProduct({ ...baseItem, compare_at_price: 90000 });
    const pricing = resolveProductPricing(product.priceRange.minVariantPrice, product.compareAtPrice);

    expect(product.compareAtPrice).toEqual({ amount: '90000', currencyCode: 'COP' });
    expect(pricing).toMatchObject({
      hasDiscount: true,
      formattedCurrentPrice: '$ 72.000',
      formattedCompareAtPrice: '$ 90.000',
      formattedSavings: '$ 18.000',
      discountPercent: 20,
    });
  });

  it('does not expose a false discount when comparison is missing or not greater than current price', () => {
    const noDiscount = adaptSupabaseProduct({ ...baseItem, compare_at_price: null });
    const invalidDiscount = adaptSupabaseProduct({ ...baseItem, compare_at_price: 72000 });

    expect(resolveProductPricing(noDiscount.priceRange.minVariantPrice, noDiscount.compareAtPrice)).toMatchObject({
      hasDiscount: false,
      formattedCurrentPrice: '$ 72.000',
      formattedCompareAtPrice: undefined,
    });
    expect(resolveProductPricing(invalidDiscount.priceRange.minVariantPrice, invalidDiscount.compareAtPrice)).toMatchObject({
      hasDiscount: false,
      formattedCurrentPrice: '$ 72.000',
      formattedCompareAtPrice: undefined,
    });
    expect(invalidDiscount.compareAtPrice).toBeUndefined();
  });

  it('returns the admin warning copy for invalid comparison prices', () => {
    expect(getAdminCompareAtPriceNotice('72000', '70000')).toBe(
      'El precio anterior debe ser mayor al precio de venta actual para mostrar descuento. Se guardará sin precio tachado.',
    );
    expect(getAdminCompareAtPriceNotice('72000', '90000')).toBeNull();
    expect(getAdminCompareAtPriceNotice('72000', '')).toBeNull();
  });
});
