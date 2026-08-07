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

// D29: the cart drawer (header.tsx) never knows a destination, so it never
// passes `shippingAmount` and `total` keeps mirroring `subtotal` -- exactly
// the "shipping is calculated at checkout" promise the drawer's own copy
// makes. app/checkout/page.tsx is the one caller that resolves a real
// shipping amount (lib/shipping/quote.ts) and passes it here once it has
// one, which is the only thing that makes `total` genuinely diverge.
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
  shippingAmount?: number;
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

  const subtotal = args.total;
  const total = subtotal + (args.shippingAmount ?? 0);

  return {
    lines,
    subtotal,
    total,
    currencyCode,
    formattedSubtotal: formatPrice(subtotal, currencyCode),
    formattedTotal: formatPrice(total, currencyCode),
  };
}
