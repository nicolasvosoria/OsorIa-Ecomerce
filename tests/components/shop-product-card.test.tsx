/* eslint-disable @next/next/no-img-element -- Test mock for next/image renders a plain img to keep component assertions focused. */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from '@/app/shop/components/product-card';
import { LatestProductCard } from '@/components/products/latest-product-card';
import { ProductsGrid } from '@/components/sections/products-grid';
import type { Product } from '@/lib/shopify/types';

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => <img src={src} alt={alt} {...props} />,
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

vi.mock('@/contexts/styles-context', () => ({
  useComponentStyle: () => ({ styles: { title: 'Productos populares' } }),
}));

vi.mock('@/contexts/admin-context', () => ({
  useAdmin: () => ({ componentEdits: new Map() }),
}));

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ store: { subdomain: 'default' } }),
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    title: 'Café Especial',
    handle: 'cafe-especial',
    productKind: 'product',
    description: 'Café premium',
    descriptionHtml: '<p>Café premium</p>',
    featuredImage: {
      url: '/coffee.jpg',
      altText: 'Café Especial',
      height: 600,
      width: 600,
    },
    currencyCode: 'COP',
    priceRange: {
      minVariantPrice: { amount: '72000', currencyCode: 'COP' },
      maxVariantPrice: { amount: '72000', currencyCode: 'COP' },
    },
    seo: {
      title: 'Café Especial',
      description: 'Café premium',
    },
    options: [],
    tags: [],
    variants: [
      {
        id: 'variant-1',
        title: 'Default',
        availableForSale: true,
        price: { amount: '72000', currencyCode: 'COP' },
        selectedOptions: [],
      },
    ],
    images: [],
    availableForSale: true,
    ...overrides,
  };
}

const comboProduct = makeProduct({
  id: 'combo-1',
  title: 'Combo Café',
  handle: 'combo-cafe',
  productKind: 'combo',
  description: 'Café + mug',
  descriptionHtml: '<p>Café + mug</p>',
  compareAtPrice: { amount: '80000', currencyCode: 'COP' },
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
});

describe('shop ProductCard combo behavior', () => {
  it('keeps a visible combo detail link while preserving card add-to-cart parity', () => {
    render(<ProductCard product={comboProduct} />);

    const detailLink = screen.getByRole('link', { name: /ver detalle/i });
    expect(detailLink).toHaveAttribute('href', '/products/combo-cafe');
    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeInTheDocument();
    expect(screen.queryByTestId('variant-selector')).not.toBeInTheDocument();
  });
});

describe('shop product card pricing visibility', () => {
  it('shows the same current and comparison COP prices on product cards and latest cards', () => {
    const saleProduct = makeProduct({ compareAtPrice: { amount: '90000', currencyCode: 'COP' } });

    render(
      <>
        <ProductCard product={saleProduct} />
        <LatestProductCard product={saleProduct} />
      </>,
    );

    expect(screen.getAllByText(/\$\s72\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/\$\s90\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Ahorra \$\s18\.000 \(20%\)/).length).toBeGreaterThanOrEqual(2);
  });

  it('does not render stale comparison or savings copy when comparison is invalid', () => {
    render(<ProductCard product={makeProduct({ compareAtPrice: { amount: '72000', currencyCode: 'COP' } })} />);

    expect(screen.getAllByText(/\$\s72\.000/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Ahorra $ 0 (0%)')).not.toBeInTheDocument();
    expect(screen.queryByText('$ 70.000')).not.toBeInTheDocument();
  });

  it('renders catalog/home grid prices with the same current and comparison values', () => {
    render(
      <ProductsGrid
        initialProducts={[
          {
            id: 'product-1',
            name: 'Café Especial',
            category: 'Café',
            price: '$ 72.000',
            compareAtPrice: '$ 90.000',
            savingsLabel: 'Ahorra $ 18.000 (20%)',
            image: '/coffee.jpg',
            slug: 'cafe-especial',
          },
          {
            id: 'product-2',
            name: 'Café Regular',
            category: 'Café',
            price: '$ 72.000',
            compareAtPrice: undefined,
            savingsLabel: undefined,
            image: '/coffee-regular.jpg',
            slug: 'cafe-regular',
          },
        ]}
      />,
    );

    const saleCard = screen.getByRole('link', { name: /café especial/i });
    expect(within(saleCard).getByText(/\$\s72\.000/)).toBeInTheDocument();
    expect(within(saleCard).getByText(/\$\s90\.000/)).toBeInTheDocument();
    expect(within(saleCard).getByText(/Ahorra \$\s18\.000 \(20%\)/)).toBeInTheDocument();

    const regularCard = screen.getByRole('link', { name: /café regular/i });
    expect(within(regularCard).getByText(/\$\s72\.000/)).toBeInTheDocument();
    expect(within(regularCard).queryByText(/\$\s90\.000/)).not.toBeInTheDocument();
  });
});
