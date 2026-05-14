import type { Cart, CartItem as ShopifyCartItem } from '@/lib/shopify/types';
import type { CartItem as LocalCartItem } from '@/contexts/cart-context';
import type { Language } from '@/lib/i18n/translations';

const LANGUAGE_LOCALES: Record<Language, string> = {
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

export function buildShopifyCartSummary(cart: Cart, language: Language): CartSummary {
  const currencyCode = cart.cost.totalAmount.currencyCode || cart.cost.subtotalAmount.currencyCode || 'COP';
  const lines = cart.lines.map(line => buildShopifyLine(line, language));
  const subtotal = parseMoneyAmount(cart.cost.subtotalAmount.amount);
  const total = parseMoneyAmount(cart.cost.totalAmount.amount);

  return {
    lines,
    subtotal,
    total,
    currencyCode,
    formattedSubtotal: formatCartMoney(subtotal, currencyCode, language),
    formattedTotal: formatCartMoney(total, currencyCode, language),
  };
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

function buildShopifyLine(line: ShopifyCartItem, language: Language): CartSummaryLine {
  const amount = parseMoneyAmount(line.cost.totalAmount.amount);
  const currencyCode = line.cost.totalAmount.currencyCode || 'COP';

  return {
    id: line.id,
    name: line.merchandise.product.title,
    quantity: line.quantity,
    currencyCode,
    amount,
    formattedLineTotal: formatCartMoney(amount, currencyCode, language),
  };
}

function parseMoneyAmount(amount: string | number): number {
  const parsed = typeof amount === 'number' ? amount : Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}
