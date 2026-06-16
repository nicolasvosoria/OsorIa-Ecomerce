import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogProductsList } from '@/components/catalog/catalog-products-list'

const mockOpenModal = vi.fn()

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/hooks/use-quantity-modal', () => ({
  useQuantityModal: () => ({ openModal: mockOpenModal, QuantityModalComponent: <div data-testid="quantity-modal" /> }),
}))

describe('CatalogProductsList', () => {
  it('renders the shared card price pattern and keeps quantity modal payloads', () => {
    render(
      <CatalogProductsList
        products={[{
          id: 'catalog-1',
          name: 'Cámara 4K',
          category: 'Video',
          price: '$99',
          compareAtPrice: '$129',
          image: '',
          slug: 'camara-4k',
        }]}
      />,
    )

    expect(screen.getByText('Cámara 4K')).toBeInTheDocument()
    expect(screen.getByText('$99')).toBeInTheDocument()
    expect(screen.getByText('$129')).toHaveClass('line-through')
    expect(screen.getByRole('img', { name: /sin imagen para cámara 4k/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(mockOpenModal).toHaveBeenCalledWith(expect.objectContaining({ id: 'catalog-1', name: 'Cámara 4K', price: '$99' }))
  })
})
