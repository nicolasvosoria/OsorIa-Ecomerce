import type { CartItem as LocalCartItem } from '@/contexts/cart-context';
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

export type CartSummary = {
  lines: CartSummaryLine[];
  subtotal: number;
  total: number;
  currencyCode: string;
  formattedSubtotal: string;
  formattedTotal: string;
};

export function formatCartMoney(amount: string | number, currencyCode: string | undefined, language: Language): string {
  const currency = currencyCode || 'COP';
  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

  return new Intl.NumberFormat(LANGUAGE_LOCALES[language], {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'COP' ? 'code' : 'narrowSymbol',
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(safeAmount);
}

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
      formattedLineTotal: formatCartMoney(amount, lineCurrency, args.language),
      itemKind: item.itemKind,
    };
  });

  return {
    lines,
    subtotal: args.total,
    total: args.total,
    currencyCode,
    formattedSubtotal: formatCartMoney(args.total, currencyCode, args.language),
    formattedTotal: formatCartMoney(args.total, currencyCode, args.language),
  };
}
