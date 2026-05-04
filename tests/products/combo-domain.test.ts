import { describe, expect, it } from 'vitest'

import { hydrateCombos } from '@/lib/supabase/combos-api'
import {
  calculateComboPricing,
  deriveComboAvailability,
} from '@/lib/combos'

type ScriptedResponse = { data?: unknown; error?: unknown }

function createComboHydrationSupabase(script: Record<string, ScriptedResponse[]>) {
  return {
    from(table: string) {
      const builder = {
        select() {
          return builder
        },
        in() {
          return builder
        },
        order() {
          return builder
        },
        then<TResult1 = ScriptedResponse, TResult2 = never>(
          onfulfilled?: ((value: ScriptedResponse) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          const response = script[table]?.shift() || { data: [], error: null }
          return Promise.resolve(response).then(onfulfilled, onrejected)
        },
      }

      return builder
    },
  }
}

describe('combo domain pricing and stock', () => {
  const components = [
    {
      productId: 'coffee-250g',
      productName: 'Café 250g',
      unitPrice: 30000,
      quantity: 2,
      currencyCode: 'COP',
      trackInventory: true,
      availableQuantity: 5,
      isAvailable: true,
    },
    {
      productId: 'mug',
      productName: 'Mug',
      unitPrice: 20000,
      quantity: 1,
      currencyCode: 'COP',
      trackInventory: true,
      availableQuantity: 10,
      isAvailable: true,
    },
  ]

  it('calculates percentage discount from current component prices', () => {
    const pricing = calculateComboPricing(components, { type: 'percentage', value: 10 })

    expect(pricing.componentSubtotal).toBe(80000)
    expect(pricing.discountAmount).toBe(8000)
    expect(pricing.finalUnitPrice).toBe(72000)
    expect(pricing.components).toEqual([
      expect.objectContaining({ productId: 'coffee-250g', lineSubtotal: 60000 }),
      expect.objectContaining({ productId: 'mug', lineSubtotal: 20000 }),
    ])
  })

  it('clamps fixed-COP discount so final price never goes below zero', () => {
    const pricing = calculateComboPricing(components, { type: 'fixed_cop', value: 120000 })

    expect(pricing.componentSubtotal).toBe(80000)
    expect(pricing.discountAmount).toBe(80000)
    expect(pricing.finalUnitPrice).toBe(0)
  })

  it('derives combo stock as the minimum purchasable component ratio', () => {
    const availability = deriveComboAvailability(components)

    expect(availability.isAvailable).toBe(true)
    expect(availability.derivedStock).toBe(2)
    expect(availability.blockingComponents).toEqual([])
  })

  it('blocks requested quantity when any component lacks stock', () => {
    const availability = deriveComboAvailability(components, 3)

    expect(availability.isAvailable).toBe(false)
    expect(availability.blockingComponents).toEqual([
      expect.objectContaining({
        productId: 'coffee-250g',
        requiredQuantity: 6,
        availableQuantity: 5,
      }),
    ])
  })

  it('marks hydrated combos unavailable when component integrity fails closed', async () => {
    const supabase = createComboHydrationSupabase({
      product_combo_components: [
        {
          data: [
            { combo_id: 'combo-missing', product_id: 'missing-product', variant_id: null, quantity: 1 },
            { combo_id: 'combo-missing', product_id: 'valid-product', variant_id: 'foreign-variant', quantity: 1 },
            { combo_id: 'combo-single', product_id: 'valid-product', variant_id: null, quantity: 1 },
          ],
          error: null,
        },
      ],
      store_items: [
        {
          data: [
            {
              id: 'valid-product',
              item_name: 'Producto válido',
              base_price: 10000,
              currency_code: 'COP',
              is_active: true,
              is_available_for_sale: true,
            },
          ],
          error: null,
        },
      ],
      item_variants: [
        {
          data: [
            {
              id: 'foreign-variant',
              item_id: 'another-product',
              price: 12000,
              is_available: true,
            },
          ],
          error: null,
        },
      ],
    })

    const hydrated = await hydrateCombos(
      [
        { id: 'combo-missing', name: 'Combo inválido', discount_type: 'percentage', discount_value: 0, is_active: true },
        { id: 'combo-single', name: 'Combo incompleto', discount_type: 'percentage', discount_value: 0, is_active: true },
      ],
      supabase,
    )

    expect(hydrated).toHaveLength(2)
    expect(hydrated[0].availability.isAvailable).toBe(false)
    expect(hydrated[0].availability.blockingComponents.length).toBeGreaterThan(0)
    expect(hydrated[1].availability.isAvailable).toBe(false)
    expect(hydrated[1].availability.blockingComponents).toEqual(
      expect.arrayContaining([expect.objectContaining({ productName: 'Combo incompleto' })]),
    )
  })
})
