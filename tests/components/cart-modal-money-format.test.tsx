import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translations, type Language } from '@/lib/i18n/translations';
import type { Cart } from '@/lib/shopify/types';
import CartModal from '@/components/cart/modal';

const state = vi.hoisted(() => ({
  cart: undefined as Cart | undefined,
  isPending: false,
  language: 'es' as Language,
}));

vi.mock('@/components/cart/cart-context', () => ({
  useCart: () => ({
    cart: state.cart,
    isPending: state.isPending,
    addItem: vi.fn(),
    updateItem: vi.fn(),
  }),
}));

vi.mock('@/contexts/language-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/i18n/translations')>('@/lib/i18n/translations');
  return {
    useLanguage: () => ({
      language: state.language,
      t: actual.translations[state.language],
      setLanguage: vi.fn(),
      availableLanguages: [],
    }),
  };
});

vi.mock('@/lib/hooks/use-body-scroll-lock', () => ({
  useBodyScrollLock: vi.fn(),
}));

vi.mock('@/components/cart/checkout-options-dialog', () => ({
  CheckoutOptionsDialog: () => null,
}));

vi.mock('@/components/cart/cart-item', () => ({
  CartItemCard: ({ item }: { item: { quantity: number; merchandise: { product: { title: string } } } }) => (
    <div>
      <span>{item.merchandise.product.title}</span>
      <span>{translations[state.language].cart.quantityLabel}: {item.quantity}</span>
    </div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('motion/react', async () => {
  const ReactActual = await vi.importActual<typeof React>('react');
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ReactActual.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>>(({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, layout: _layout, ...props }, ref) => (
        <div ref={ref} {...props}>{children}</div>
      )),
    },
  };
});

describe('CartModal money formatting and localized states', () => {
  beforeEach(() => {
    state.cart = undefined;
    state.isPending = false;
    state.language = 'es';
  });

  it('shows localized loading copy while the cart is unresolved and does not show empty copy', () => {
    renderOpenCart();

    expect(screen.getByText(translations.es.cart.loading)).toBeInTheDocument();
    expect(screen.queryByText(translations.es.cart.empty)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: translations.es.cart.checkout })).not.toBeInTheDocument();
  });

  it('shows localized empty copy only after an empty cart is known', () => {
    state.cart = makeCart({ totalQuantity: 0, amount: '0', currencyCode: 'COP', lines: [] });

    renderOpenCart();

    expect(screen.getByText(translations.es.cart.empty)).toBeInTheDocument();
    expect(screen.getByText(translations.es.cart.emptyDescription)).toBeInTheDocument();
    expect(screen.queryByText(translations.es.cart.loading)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: translations.es.cart.checkout })).not.toBeInTheDocument();
  });

  it.each([
    ['es' as Language, translations.es.cart.products, translations.es.cart.quantityLabel],
    ['en' as Language, translations.en.cart.products, translations.en.cart.quantityLabel],
    ['pt' as Language, translations.pt.cart.products, translations.pt.cart.quantityLabel],
  ])('renders %s cart copy for populated cart labels', (language, productsLabel, quantityLabel) => {
    state.language = language;
    state.cart = makeCart({ totalQuantity: 2, amount: '1234567', currencyCode: 'COP' });

    renderOpenCart();

    expect(screen.getByText(translations[language].cart.title)).toBeInTheDocument();
    expect(screen.getByText(productsLabel)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(quantityLabel, 'i'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: translations[language].cart.checkout })).toBeEnabled();
  });

  it('formats covered COP totals without raw numeric strings in the populated modal', () => {
    state.language = 'es';
    state.cart = makeCart({ totalQuantity: 2, amount: '1234567', currencyCode: 'COP' });

    renderOpenCart();

    expect(screen.getAllByText(/COP/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1[\s.]234[\s.]567/).length).toBeGreaterThan(0);
    expect(screen.queryByText('1234567')).not.toBeInTheDocument();
    expect(screen.queryByText('1234567.00')).not.toBeInTheDocument();
  });
});

function renderOpenCart() {
  render(<CartModal />);
  fireEvent.click(screen.getByRole('button', { name: translations[state.language].nav.cart }));
}

function makeCart(args: {
  totalQuantity: number;
  amount: string;
  currencyCode: string;
  lines?: Cart['lines'];
}): Cart {
  const lines = args.lines ?? [
    {
      id: 'line-1',
      quantity: args.totalQuantity,
      cost: { totalAmount: { amount: args.amount, currencyCode: args.currencyCode } },
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
            minVariantPrice: { amount: args.amount, currencyCode: args.currencyCode },
            maxVariantPrice: { amount: args.amount, currencyCode: args.currencyCode },
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
  ];

  return {
    id: 'cart-1',
    checkoutUrl: '/checkout',
    totalQuantity: args.totalQuantity,
    cost: {
      subtotalAmount: { amount: args.amount, currencyCode: args.currencyCode },
      totalAmount: { amount: args.amount, currencyCode: args.currencyCode },
      totalTaxAmount: { amount: '0', currencyCode: args.currencyCode },
    },
    lines,
  };
}
