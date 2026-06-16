import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PopularItems } from '@/components/sections/popular-items'
import type { CommerceProductCard } from '@/lib/types/products'

const mockUseStore = vi.fn()
const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()
const mockAddToCart = vi.fn()

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/contexts/store-context', () => ({ useStore: () => mockUseStore() }))
vi.mock('@/contexts/styles-context', () => ({ useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args) }))
vi.mock('@/contexts/admin-context', () => ({ useAdmin: () => mockUseAdmin() }))
vi.mock('@/contexts/cart-context', () => ({ useCart: () => ({ addToCart: mockAddToCart }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('@/contexts/language-context', () => ({
  useLanguage: () => ({
    language: 'es',
    t: {
      products: { addToCart: 'Agregar al carrito', addToCartDescription: '{quantity} {unit} de {name} {verb} agregado{plural}' },
      wishlist: { viewDetails: 'Ver detalles', addedToCart: 'Agregado' },
    },
  }),
}))
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselNext: () => <button type="button">Siguiente</button>,
  CarouselPrevious: () => <button type="button">Anterior</button>,
}))
vi.mock('@/components/cart/quantity-modal', () => ({
  QuantityModal: ({ open, productName }: { open: boolean; productName: string }) => open ? <div role="dialog">Cantidad {productName}</div> : null,
}))

const product: CommerceProductCard = {
  id: 'popular-1',
  title: 'Speaker Pro',
  href: '/products/speaker-pro',
  imageAlt: 'Speaker Pro',
  category: 'Audio',
  price: {
    amount: 99000,
    currencyCode: 'COP',
    label: '$ 99.000',
    compareAtAmount: 129000,
    compareAtLabel: '$ 129.000',
    hasDiscount: true,
  },
  badges: [{ label: 'Oferta', tone: 'sale' }],
  ctaLabel: 'Ver detalles',
}

describe('PopularItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStore.mockReturnValue({ store: { subdomain: 'default' } })
    mockUseComponentStyle.mockReturnValue({ styles: { title: 'Lo más vendido' } })
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
  })

  it('renders shared DTO cards with compare price and preserves add-to-cart modal flow', () => {
    render(<PopularItems initialProducts={[product]} />)

    expect(screen.getByRole('heading', { name: 'Lo más vendido' })).toBeInTheDocument()
    expect(screen.getByText('Speaker Pro')).toBeInTheDocument()
    expect(screen.getByText(/99\.000/)).toBeInTheDocument()
    expect(screen.getByText(/129\.000/)).toHaveClass('line-through')
    expect(screen.getByRole('img', { name: 'Speaker Pro' })).toHaveAttribute('src', '/placeholder.svg')
    expect(screen.getByRole('link', { name: /ver detalles/i })).toHaveAttribute('href', '/products/speaker-pro')

    fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Cantidad Speaker Pro')
  })
})
