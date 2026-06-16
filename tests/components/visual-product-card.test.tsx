import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VisualProductCard } from '@/components/products/visual-product-card'
import type { CommerceProductCard } from '@/lib/types/products'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const product: CommerceProductCard = {
  id: 'product-1',
  title: 'Auriculares Premium',
  description: 'Audio inalámbrico',
  href: '/products/auriculares-premium',
  imageUrl: '/products/headphones.png',
  imageAlt: 'Auriculares negros',
  category: 'Audio',
  price: {
    amount: 129000,
    currencyCode: 'COP',
    label: '$ 129.000',
    compareAtAmount: 159000,
    compareAtLabel: '$ 159.000',
    hasDiscount: true,
  },
  badges: [{ label: 'Oferta', tone: 'sale' }],
  ctaLabel: 'Ver detalles',
}

describe('VisualProductCard', () => {
  it('renders the shared product card content with accessible links and price semantics', () => {
    render(<VisualProductCard product={product} />)

    expect(screen.getByRole('link', { name: /ver auriculares premium/i })).toHaveAttribute('href', product.href)
    expect(screen.getByRole('img', { name: 'Auriculares negros' })).toHaveAttribute('src', product.imageUrl)
    expect(screen.getByText('Audio')).toBeInTheDocument()
    expect(screen.getByText('Auriculares Premium')).toBeInTheDocument()
    expect(screen.getByText(/129\.000/)).toBeInTheDocument()
    expect(screen.getByText(/159\.000/)).toHaveClass('line-through')
    expect(screen.getByText('Oferta')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver detalles/i })).toHaveAttribute('href', product.href)
  })

  it('uses a no-image fallback and omits optional compare, category, badge, and CTA content cleanly', () => {
    render(
      <VisualProductCard
        product={{
          ...product,
          category: undefined,
          imageUrl: undefined,
          imageAlt: 'Auriculares Premium',
          price: {
            amount: 129000,
            currencyCode: 'COP',
            label: '$ 129.000',
            hasDiscount: false,
          },
          badges: [],
          ctaLabel: undefined,
        }}
        showCta={false}
      />,
    )

    expect(screen.getByRole('img', { name: /sin imagen para auriculares premium/i })).toBeInTheDocument()
    expect(screen.queryByText('Audio')).not.toBeInTheDocument()
    expect(screen.queryByText(/159\.000/)).not.toBeInTheDocument()
    expect(screen.queryByText('Oferta')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ver detalles/i })).not.toBeInTheDocument()
  })

  it('falls back when a tenant-provided image URL fails to load', () => {
    render(<VisualProductCard product={product} />)

    fireEvent.error(screen.getByRole('img', { name: 'Auriculares negros' }))

    expect(screen.getByRole('img', { name: /sin imagen para auriculares premium/i })).toBeInTheDocument()
  })

  it('places favorite and custom action slots without nesting them in the product link', () => {
    render(
      <VisualProductCard
        product={product}
        favoriteSlot={<button type="button" aria-label="Agregar a favoritos" />}
        actionSlot={<button type="button">Agregar al carrito</button>}
      />,
    )

    expect(screen.getByRole('button', { name: /agregar a favoritos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeInTheDocument()
  })
})
