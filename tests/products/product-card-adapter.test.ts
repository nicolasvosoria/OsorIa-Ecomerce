import { describe, expect, it } from 'vitest'
import {
  normalizeCommercePrice,
  toCommerceProductCard,
} from '@/lib/products/adapter'
import type { StoreItemWithDetails } from '@/lib/types/products'

function makeItem(overrides: Partial<StoreItemWithDetails> = {}): StoreItemWithDetails {
  return {
    id: 'product-1',
    item_name: 'Auriculares Premium',
    item_description: 'Audio inalámbrico',
    category_id: 'cat-1',
    base_price: 129000,
    compare_at_price: 159000,
    currency_code: 'COP',
    is_active: true,
    is_featured: true,
    is_available_for_sale: true,
    track_inventory: false,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    item_slug: 'auriculares-premium',
    primary_image_url: '/products/headphones.png',
    primary_image_alt: 'Auriculares negros',
    display_order: 1,
    view_count: 0,
    created_at: '2026-05-14T00:00:00Z',
    updated_at: '2026-05-14T00:00:00Z',
    category: {
      id: 'cat-1',
      category_name: 'Audio',
      display_order: 1,
      is_active: true,
      created_at: '2026-05-14T00:00:00Z',
      updated_at: '2026-05-14T00:00:00Z',
    },
    ...overrides,
  }
}

describe('commerce product card adapters', () => {
  it('normalizes Supabase product data into the shared card DTO', () => {
    const card = toCommerceProductCard(makeItem())

    expect(card).toMatchObject({
      id: 'product-1',
      title: 'Auriculares Premium',
      description: 'Audio inalámbrico',
      href: '/products/auriculares-premium',
      imageUrl: '/products/headphones.png',
      imageAlt: 'Auriculares negros',
      category: 'Audio',
      availableForSale: true,
    })
    expect(card.price.label).toBe('$ 129.000')
    expect(card.price.compareAtLabel).toBe('$ 159.000')
    expect(card.price.hasDiscount).toBe(true)
    expect(card.badges).toEqual([{ label: 'Oferta', tone: 'sale' }])
  })

  it('omits misleading discount treatment when compare-at is not greater than base price', () => {
    expect(normalizeCommercePrice(129000, 'COP', 129000)).toMatchObject({
      label: '$ 129.000',
      compareAtLabel: undefined,
      hasDiscount: false,
    })

    const card = toCommerceProductCard(makeItem({ compare_at_price: 99000 }))
    expect(card.price.compareAtLabel).toBeUndefined()
    expect(card.badges).toEqual([])
  })

  it('falls back to id href, placeholder image, and combo badge when optional data is absent', () => {
    const card = toCommerceProductCard(
      makeItem({
        item_slug: undefined,
        primary_image_url: undefined,
        primary_image_alt: undefined,
        compare_at_price: undefined,
        category: undefined,
        item_kind: 'combo',
        combo: {} as StoreItemWithDetails['combo'],
      }),
    )

    expect(card.href).toBe('/products/product-1')
    expect(card.imageUrl).toBe('/placeholder.svg')
    expect(card.imageAlt).toBe('Auriculares Premium')
    expect(card.category).toBeUndefined()
    expect(card.badges).toEqual([{ label: 'Combo', tone: 'combo' }])
  })
})
