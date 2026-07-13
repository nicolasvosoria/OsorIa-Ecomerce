import { describe, expect, it } from 'vitest';
import {
  buildLocalCartSummary,
  formatCartMoney,
} from '@/lib/cart/cart-summary';
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
