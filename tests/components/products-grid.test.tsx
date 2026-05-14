import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductsGrid } from '@/components/sections/products-grid'
import type { CommerceProductCard } from '@/lib/types/products'

const mockUseStore = vi.fn()
const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => mockUseStore(),
}))

vi.mock('@/contexts/styles-context', () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}))

vi.mock('@/contexts/admin-context', () => ({
  useAdmin: () => mockUseAdmin(),
}))

const dtoProduct: CommerceProductCard = {
  id: 'product-1',
  title: 'Auriculares Premium',
  href: '/products/auriculares-premium',
  imageAlt: 'Auriculares Premium',
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

describe('ProductsGrid', () => {
  beforeEach(() => {
    mockUseStore.mockReturnValue({ store: { subdomain: 'default' } })
    mockUseComponentStyle.mockReturnValue({ styles: { title: 'Productos destacados' } })
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
  })

  it('renders shared DTO products with compare price, badges, CTA, and no-image fallback', () => {
    render(<ProductsGrid initialProducts={[dtoProduct]} />)

    expect(screen.getByRole('heading', { name: 'Productos destacados' })).toBeInTheDocument()
    expect(screen.getByText('Auriculares Premium')).toBeInTheDocument()
    expect(screen.getByText('Audio')).toBeInTheDocument()
    expect(screen.getByText(/129\.000/)).toBeInTheDocument()
    expect(screen.getByText(/159\.000/)).toHaveClass('line-through')
    expect(screen.getByText('Oferta')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /sin imagen para auriculares premium/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver detalles/i })).toHaveAttribute('href', '/products/auriculares-premium')
  })

  it('preserves admin-edited legacy product records and generated slugs', () => {
    mockUseAdmin.mockReturnValue({
      componentEdits: new Map([
        ['products', {
          title: 'Ofertas editadas',
          products: [{ id: 'edited-1', name: 'Cámara 4K', category: 'Video', price: '$99', image: '' }],
        }],
      ]),
    })

    render(<ProductsGrid />)

    expect(screen.getByRole('heading', { name: 'Ofertas editadas' })).toBeInTheDocument()
    expect(screen.getByText('Cámara 4K')).toBeInTheDocument()
    expect(screen.getByText('$99')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver cámara 4k/i })).toHaveAttribute('href', '/products/camara-4k')
  })
})
