/* eslint-disable @next/next/no-img-element */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LatestProductCard } from '@/components/products/latest-product-card'
import type { Product } from '@/lib/shopify/types'

vi.mock('next/image', () => ({
  default: ({ src, alt, priority, ...props }: { src: string; alt: string; priority?: boolean }) => (
    <img src={src} alt={alt} data-priority={priority ? 'true' : 'false'} {...props} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/products/featured-product-label', () => ({
  FeaturedProductLabel: ({ product }: { product: Product }) => (
    <div data-testid="featured-product-label">{product.title}</div>
  ),
}))

const productWithGallery: Product = {
  id: 'product-1',
  title: 'Café con galería',
  handle: 'cafe-galeria',
  description: 'Producto con 5 imágenes',
  descriptionHtml: '<p>Producto con 5 imágenes</p>',
  featuredImage: {
    url: 'https://cdn.example.com/primary.webp',
    altText: 'Imagen primaria del café',
    height: 800,
    width: 800,
  },
  images: [
    { url: 'https://cdn.example.com/primary.webp', altText: 'Imagen primaria del café', height: 800, width: 800 },
    { url: 'https://cdn.example.com/gallery-2.webp', altText: 'Galería 2', height: 800, width: 800 },
    { url: 'https://cdn.example.com/gallery-3.webp', altText: 'Galería 3', height: 800, width: 800 },
    { url: 'https://cdn.example.com/gallery-4.webp', altText: 'Galería 4', height: 800, width: 800 },
    { url: 'https://cdn.example.com/gallery-5.webp', altText: 'Galería 5', height: 800, width: 800 },
  ],
  availableForSale: true,
  currencyCode: 'COP',
  priceRange: {
    minVariantPrice: { amount: '12000', currencyCode: 'COP' },
    maxVariantPrice: { amount: '12000', currencyCode: 'COP' },
  },
  compareAtPrice: null,
  seo: {
    title: 'Café con galería',
    description: 'Producto con 5 imágenes',
  },
  options: [],
  tags: [],
  variants: [
    {
      id: 'variant-1',
      title: 'Default',
      availableForSale: true,
      price: { amount: '12000', currencyCode: 'COP' },
      selectedOptions: [],
    },
  ],
}

describe('LatestProductCard primary image behavior', () => {
  it('uses the featured/primary image even when the product has a 5-image gallery', () => {
    render(<LatestProductCard product={productWithGallery} />)

    const primaryImage = screen.getByRole('img', { name: 'Imagen primaria del café' })
    expect(primaryImage).toHaveAttribute('src', 'https://cdn.example.com/primary.webp')
    expect(screen.queryByRole('img', { name: 'Galería 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/cafe-galeria')
  })

  it('keeps principal cards on the featured/primary image', () => {
    render(<LatestProductCard product={productWithGallery} principal />)

    const primaryImage = screen.getByRole('img', { name: 'Imagen primaria del café' })
    expect(primaryImage).toHaveAttribute('src', 'https://cdn.example.com/primary.webp')
    expect(primaryImage).toHaveAttribute('data-priority', 'true')
  })
})
