import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from '@/app/shop/components/product-card';
import type { Product } from '@/lib/shopify/types';

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/cart/add-to-cart', () => ({
  AddToCart: () => <button type="button">Agregar al carrito</button>,
  AddToCartButton: () => <button type="button">Agregar al carrito</button>,
}));

vi.mock('@/app/shop/components/product-card/product-image', () => ({
  ProductImage: () => <div data-testid="product-image" />,
}));

vi.mock('@/app/shop/components/variant-selector', () => ({
  VariantSelector: () => <div data-testid="variant-selector" />,
}));

vi.mock('@/components/wishlist/wishlist-button', () => ({
  WishlistButton: () => <button type="button" aria-label="Agregar a favoritos" />,
}));

const comboProduct: Product = {
  id: 'combo-1',
  title: 'Combo Café',
  handle: 'combo-cafe',
  productKind: 'combo',
  description: 'Café + mug',
  descriptionHtml: '<p>Café + mug</p>',
  featuredImage: {
    url: '/combo.jpg',
    altText: 'Combo Café',
    height: 600,
    width: 600,
  },
  currencyCode: 'COP',
  priceRange: {
    minVariantPrice: { amount: '72000', currencyCode: 'COP' },
    maxVariantPrice: { amount: '72000', currencyCode: 'COP' },
  },
  compareAtPrice: { amount: '80000', currencyCode: 'COP' },
  seo: {
    title: 'Combo Café',
    description: 'Café + mug',
  },
  options: [],
  tags: ['combo'],
  variants: [
    {
      id: 'combo-1',
      title: 'Combo',
      availableForSale: true,
      price: { amount: '72000', currencyCode: 'COP' },
      selectedOptions: [],
    },
  ],
  images: [],
  availableForSale: true,
};

describe('shop ProductCard combo behavior', () => {
  it('keeps a visible combo detail link while preserving card add-to-cart parity', () => {
    render(<ProductCard product={comboProduct} />);

    const detailLink = screen.getByRole('link', { name: /ver detalle/i });
    expect(detailLink).toHaveAttribute('href', '/products/combo-cafe');
    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeInTheDocument();
    expect(screen.queryByTestId('variant-selector')).not.toBeInTheDocument();
  });
});
