import type { CartItem as LocalCartItem } from '@/contexts/cart-context';
import { formatPrice } from '@/lib/commerce/utils';
import type { Language } from '@/lib/i18n/translations';

export const LANGUAGE_LOCALES: Record<Language, string> = {
  es: 'es-CO',
  en: 'en-US',
  pt: 'pt-BR',
};

export type CartSummaryLine = {
  id: string;
  name: string;
  quantity: number;
  currencyCode: string;
  amount: number;
  formattedLineTotal: string;
  itemKind?: LocalCartItem['itemKind'];
};

// `total` stays alongside `subtotal` even though shipping is still hardcoded to
// zero: app/checkout/page.tsx (untouched this slice) and the standing money-formatter
// contract in tests/quality/cart-summary-usage.test.ts both read `formattedTotal`
// today. A later slice adds the real shipping amount here, which is when `total`
// will start to genuinely differ from `subtotal` instead of mirroring it.
export type CartSummary = {
  lines: CartSummaryLine[];
  subtotal: number;
  total: number;
  currencyCode: string;
  formattedSubtotal: string;
  formattedTotal: string;
};

export function buildLocalCartSummary(args: {
  items: LocalCartItem[];
  getItemSubtotal: (item: LocalCartItem) => number;
  total: number;
  language: Language;
  defaultCurrencyCode?: string;
}): CartSummary {
  const currencyCode = args.items.find(item => item.currencyCode)?.currencyCode || args.defaultCurrencyCode || 'COP';
  const lines = args.items.map(item => {
    const lineCurrency = item.currencyCode || currencyCode;
    const amount = args.getItemSubtotal(item);

    return {
      id: String(item.id),
      name: item.name,
      quantity: item.quantity,
      currencyCode: lineCurrency,
      amount,
      formattedLineTotal: formatPrice(amount, lineCurrency),
      itemKind: item.itemKind,
    };
  });

  return {
    lines,
    subtotal: args.total,
    total: args.total,
    currencyCode,
    formattedSubtotal: formatPrice(args.total, currencyCode),
    formattedTotal: formatPrice(args.total, currencyCode),
  };
}
