import { describe, expect, it } from 'vitest';
import { buildLocalCartSummary } from '@/lib/cart/cart-summary';
import type { CartItem as LocalCartItem } from '@/contexts/cart-context';

describe('cart summary formatting', () => {
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
    });

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]).toMatchObject({ id: 'combo-1', name: 'Combo Café', quantity: 3 });
    expect(summary.lines[0].formattedLineTotal).toBe(summary.formattedTotal);
    expect(summary.formattedSubtotal).toBe(summary.formattedTotal);
    expect(summary.formattedTotal).toBe('$ 1.350.000');
  });
});
