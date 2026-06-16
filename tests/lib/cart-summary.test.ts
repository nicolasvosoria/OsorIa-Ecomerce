import { describe, expect, it } from 'vitest';
import {
  buildLocalCartSummary,
  buildShopifyCartSummary,
  formatCartMoney,
} from '@/lib/cart/cart-summary';
import type { Cart } from '@/lib/shopify/types';
import type { CartItem as LocalCartItem } from '@/contexts/cart-context';

describe('cart summary formatting', () => {
  it('formats COP thousands with active Spanish locale and currency identity', () => {
    const formatted = formatCartMoney(1234567, 'COP', 'es');

    expect(formatted).toContain('COP');
    expect(formatted).toMatch(/1[\s.]234[\s.]567/);
    expect(formatted).not.toContain('1234567');
    expect(formatted).not.toContain('1234567.00');
  });

  it('formats USD and EUR with explicit currency-aware output', () => {
    expect(formatCartMoney('1234.5', 'USD', 'en')).toMatch(/\$|USD/);
    expect(formatCartMoney('9876.5', 'EUR', 'pt')).toMatch(/€|EUR/);
  });

  it('builds a Shopify summary with matching formatted line, subtotal, and total values', () => {
    const cart = makeShopifyCart({
      lineAmount: '1234567',
      subtotal: '1234567',
      total: '1234567',
      currencyCode: 'COP',
      quantity: 2,
    });

    const summary = buildShopifyCartSummary(cart, 'es');

    expect(summary.currencyCode).toBe('COP');
    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]).toMatchObject({ id: 'line-1', quantity: 2, formattedLineTotal: summary.formattedTotal });
    expect(summary.formattedSubtotal).toBe(summary.formattedTotal);
    expect(summary.formattedTotal).toContain('COP');
    expect(summary.formattedTotal).not.toContain('1234567');
  });

  it('builds a local combo summary from caller-provided subtotals and total', () => {
    const combo: LocalCartItem = {
      id: 'combo-1',
      name: 'Combo Café',
      price: '$ 450.000',
      image: '/combo.jpg',
      quantity: 3,
      itemKind: 'combo',
      comboId: 'combo-1',
      currencyCode: 'COP',
      unitPriceAmount: 450000,
    };

    const summary = buildLocalCartSummary({
      items: [combo],
      getItemSubtotal: item => item.unitPriceAmount! * item.quantity,
      total: 1350000,
      language: 'es',
    });

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]).toMatchObject({ id: 'combo-1', name: 'Combo Café', quantity: 3 });
    expect(summary.lines[0].formattedLineTotal).toBe(summary.formattedTotal);
    expect(summary.formattedSubtotal).toBe(summary.formattedTotal);
    expect(summary.formattedTotal).toContain('COP');
    expect(summary.formattedTotal).not.toContain('1350000');
  });
});

function makeShopifyCart(args: {
  lineAmount: string;
  subtotal: string;
  total: string;
  currencyCode: string;
  quantity: number;
}): Cart {
  return {
    id: 'cart-1',
    checkoutUrl: '/checkout',
    totalQuantity: args.quantity,
    cost: {
      subtotalAmount: { amount: args.subtotal, currencyCode: args.currencyCode },
      totalAmount: { amount: args.total, currencyCode: args.currencyCode },
      totalTaxAmount: { amount: '0', currencyCode: args.currencyCode },
    },
    lines: [
      {
        id: 'line-1',
        quantity: args.quantity,
        cost: { totalAmount: { amount: args.lineAmount, currencyCode: args.currencyCode } },
        merchandise: {
          id: 'variant-1',
          title: 'Default',
          selectedOptions: [],
          product: {
            id: 'product-1',
            title: 'Chaqueta COP',
            handle: 'chaqueta-cop',
            description: '',
            descriptionHtml: '',
            featuredImage: { url: '/p.jpg', altText: 'Chaqueta COP', width: 100, height: 100 },
            currencyCode: args.currencyCode,
            priceRange: {
              minVariantPrice: { amount: args.lineAmount, currencyCode: args.currencyCode },
              maxVariantPrice: { amount: args.lineAmount, currencyCode: args.currencyCode },
            },
            seo: { title: 'Chaqueta COP', description: '' },
            options: [],
            tags: [],
            variants: [],
            images: [{ url: '/p.jpg', altText: 'Chaqueta COP', width: 100, height: 100 }],
            availableForSale: true,
          },
        },
      },
    ],
  };
}
