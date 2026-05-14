import { describe, expect, it } from 'vitest'

import { __chatRouteTestUtils } from '@/app/api/chat/route'

describe('chat product context', () => {
  it('keeps ai_details available for assistant product answers', () => {
    const context = __chatRouteTestUtils.buildProductsContextFromList([
      {
        item_name: 'Audífonos privados',
        item_description: 'Descripción pública corta',
        base_price: 120000,
        currency_code: 'COP',
        metadata: {
          ai_details: 'Compatibles con cancelación activa y respuesta baja latencia',
        },
      },
    ], true)

    expect(context).toContain('Audífonos privados')
    expect(context).toContain('Detalles y características')
    expect(context).toContain('Compatibles con cancelación activa y respuesta baja latencia')
  })
})
