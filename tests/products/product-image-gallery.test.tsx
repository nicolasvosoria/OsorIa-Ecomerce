import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProductImageGallery } from '@/app/products/[slug]/components/product-image-gallery'

vi.mock('next/image', () => ({
  default: ({ alt, fill: _fill, priority: _priority, sizes: _sizes, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; sizes?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}))

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), undefined],
}))

const galleryImages = [
  { url: '/products/cafe-front.webp', alt: 'Café Osoría frente' },
  { url: '/products/cafe-side.webp', alt: 'Café Osoría lateral' },
  { url: '/products/cafe-pack.webp', alt: 'Café Osoría empaque' },
]

describe('ProductImageGallery', () => {
  it('shows a desktop-friendly vertical thumbnail selector beside the main image', () => {
    render(<ProductImageGallery images={galleryImages} />)

    const gallery = screen.getByRole('region', { name: /galería de imágenes del producto/i })
    const mainPanel = within(gallery).getByRole('group', { name: /imagen principal seleccionada/i })
    const mainImage = within(mainPanel).getByRole('img', { name: 'Café Osoría frente' })
    const thumbnails = within(gallery).getByRole('listbox', { name: /miniaturas de producto/i })

    expect(mainImage).toHaveAttribute('src', '/products/cafe-front.webp')
    expect(thumbnails).toHaveAttribute('aria-orientation', 'vertical')
    expect(within(thumbnails).getAllByRole('option')).toHaveLength(3)
    expect(within(thumbnails).getByRole('option', { name: /imagen 1 de 3: café osoría frente/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('updates the main image and selected thumbnail alt text when a thumbnail is chosen', async () => {
    const user = userEvent.setup()
    render(<ProductImageGallery images={galleryImages} />)

    await user.click(screen.getByRole('option', { name: /imagen 2 de 3: café osoría lateral/i }))

    const mainPanel = screen.getByRole('group', { name: /imagen principal seleccionada/i })
    expect(within(mainPanel).getByRole('img', { name: 'Café Osoría lateral' })).toHaveAttribute(
      'src',
      '/products/cafe-side.webp',
    )
    expect(screen.getByRole('option', { name: /imagen 2 de 3: café osoría lateral/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('opens an accessible zoom dialog with mouse, keyboard, touch-compatible activation, and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<ProductImageGallery images={galleryImages} />)

    await user.click(screen.getByRole('button', { name: /ampliar imagen café osoría frente/i }))
    let dialog = screen.getByRole('dialog', { name: /imagen ampliada/i })
    expect(within(dialog).getByRole('img', { name: 'Café Osoría frente' })).toHaveAttribute('src', '/products/cafe-front.webp')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /imagen ampliada/i })).not.toBeInTheDocument()

    screen.getByRole('button', { name: /ampliar imagen café osoría frente/i }).focus()
    await user.keyboard('{Enter}')
    dialog = screen.getByRole('dialog', { name: /imagen ampliada/i })
    expect(within(dialog).getByRole('button', { name: /cerrar zoom/i })).toBeInTheDocument()

    fireEvent.touchEnd(within(dialog).getByRole('button', { name: /cerrar zoom/i }))
    expect(screen.queryByRole('dialog', { name: /imagen ampliada/i })).not.toBeInTheDocument()
  })

  it('keeps the one-image case comfortable by omitting thumbnail controls while preserving zoom', async () => {
    const user = userEvent.setup()
    render(<ProductImageGallery images={[galleryImages[0]]} />)

    expect(screen.queryByRole('listbox', { name: /miniaturas de producto/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /ampliar imagen café osoría frente/i }))
    expect(screen.getByRole('dialog', { name: /imagen ampliada/i })).toBeInTheDocument()
  })

  it('renders an accessible fallback when a product has no images', () => {
    render(<ProductImageGallery images={[]} />)

    expect(screen.getByRole('img', { name: /sin imagen del producto/i })).toHaveTextContent('Sin imagen')
    expect(screen.queryByRole('button', { name: /ampliar imagen/i })).not.toBeInTheDocument()
  })
})
