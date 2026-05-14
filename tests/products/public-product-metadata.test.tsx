import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  getPublicProductMetadata,
  PublicProductMetadata,
} from '@/components/products/public-product-metadata'
import { toRelatedProductCards } from '@/lib/products/public-product-payload'

describe('PublicProductMetadata', () => {
  it('renders only allowlisted public metadata with controlled labels', () => {
    const metadata = {
      ai_details: 'Solo para el asistente: no mostrar en público',
      internal_notes: 'Margen interno privado',
      material: 'Aluminio',
      warranty: '12 meses',
      unknown_public_claim: 'No debería imprimirse automáticamente',
    }

    const specs = getPublicProductMetadata(metadata)
    const html = renderToStaticMarkup(<PublicProductMetadata metadata={metadata} />)

    expect(specs).toEqual([
      { key: 'material', label: 'Material', value: 'Aluminio' },
      { key: 'warranty', label: 'Garantía', value: '12 meses' },
    ])
    expect(html).toContain('Especificaciones')
    expect(html).toContain('Material')
    expect(html).toContain('Aluminio')
    expect(html).toContain('Garantía')
    expect(html).toContain('12 meses')
    expect(html).not.toContain('ai_details')
    expect(html).not.toContain('Solo para el asistente')
    expect(html).not.toContain('internal_notes')
    expect(html).not.toContain('Margen interno privado')
    expect(html).not.toContain('unknown_public_claim')
  })

  it('renders nothing when metadata only contains private or unknown fields', () => {
    const html = renderToStaticMarkup(
      <PublicProductMetadata
        metadata={{
          ai_details: 'Privado para el chat',
          private_notes: 'No público',
          unknown: 'Sin allowlist',
        }}
      />,
    )

    expect(html).toBe('')
  })

  it('sanitizes related product payloads before crossing client boundaries', () => {
    const [related] = toRelatedProductCards([
      {
        id: 'related-1',
        item_name: 'Producto relacionado',
        item_slug: 'producto-relacionado',
        base_price: 100000,
        compare_at_price: 120000,
        currency_code: 'COP',
        is_active: true,
        is_featured: false,
        is_available_for_sale: true,
        track_inventory: false,
        inventory_quantity: 10,
        low_stock_threshold: 1,
        display_order: 1,
        view_count: 0,
        created_at: '2026-05-14T00:00:00.000Z',
        updated_at: '2026-05-14T00:00:00.000Z',
        metadata: {
          ai_details: 'Privado para el asistente',
          internal_notes: 'Privado para admin',
        },
        images: [
          {
            id: 'image-1',
            image_url: '/related.png',
            image_alt: 'Alt privado no requerido',
            display_order: 1,
            image_type: 'product',
            created_at: '2026-05-14T00:00:00.000Z',
          },
        ],
      },
    ])

    expect(related).toEqual({
      id: 'related-1',
      item_slug: 'producto-relacionado',
      item_name: 'Producto relacionado',
      base_price: 100000,
      compare_at_price: 120000,
      currency_code: 'COP',
      primary_image_url: null,
      primary_image_alt: null,
      images: [{ image_url: '/related.png' }],
    })
    expect(JSON.stringify(related)).not.toContain('ai_details')
    expect(JSON.stringify(related)).not.toContain('Privado para el asistente')
    expect(JSON.stringify(related)).not.toContain('internal_notes')
  })
})
