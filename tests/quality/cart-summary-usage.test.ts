import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as cartSummary from '@/lib/cart/cart-summary';
import { formatPrice } from '@/lib/commerce/utils';
import { formatCommercePrice } from '@/lib/products/pricing';
import type { CartItem as LocalCartItem } from '@/contexts/cart-context';

const helperImport = "@/lib/cart/cart-summary";

describe('cart summary helper usage contract', () => {
  it.each([
    'app/checkout/page.tsx',
    'components/layout/header.tsx',
  ])('%s imports the shared cart summary helper', filePath => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain(helperImport);
  });
});

describe('single money formatter contract', () => {
  it('does not export a competing money formatter from the cart module', () => {
    expect('formatCartMoney' in cartSummary).toBe(false);
  });

  it('renders the same string for the cart, the checkout, and the product card', () => {
    const item: LocalCartItem = {
      id: 'item-1',
      name: 'Producto',
      price: '$ 50.000',
      image: '/product.jpg',
      quantity: 1,
      currencyCode: 'COP',
      unitPriceAmount: 50000,
    };

    const cartTotal = cartSummary.buildLocalCartSummary({
      items: [item],
      getItemSubtotal: line => line.unitPriceAmount! * line.quantity,
      total: 50000,
      language: 'es',
    }).formattedTotal;

    const checkoutTotal = formatPrice(50000, 'COP');
    const productCardPrice = formatCommercePrice(50000, 'COP');

    expect(cartTotal).toBe(checkoutTotal);
    expect(checkoutTotal).toBe(productCardPrice);
    expect(cartTotal).toBe('$ 50.000');
  });
});
