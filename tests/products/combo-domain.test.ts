import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSupabaseEcommerce } from '@/lib/supabase/client'
import { hydrateCombos, updateCombo } from '@/lib/supabase/combos-api'
import {
  calculateComboPricing,
  deriveComboAvailability,
} from '@/lib/combos'
import { resolveDeferredImageUpload } from '@/lib/products/deferred-image-upload'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseEcommerce: vi.fn(),
}))

const getSupabaseEcommerceMock = vi.mocked(getSupabaseEcommerce)

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

interface MutationOperation {
  table: string
  operation: string
  payload?: unknown
}

function createComboMutationSupabase(
  script: Record<string, ScriptedResponse[]>,
  operations: MutationOperation[],
) {
  return {
    from(table: string) {
      let operation = 'select'
      const builder = {
        select() {
          operation = 'select'
          return builder
        },
        update(payload: unknown) {
          operation = 'update'
          operations.push({ table, operation, payload })
          return builder
        },
        insert(payload: unknown) {
          operation = 'insert'
          operations.push({ table, operation, payload })
          return builder
        },
        delete() {
          operation = 'delete'
          operations.push({ table, operation })
          return builder
        },
        eq() {
          return builder
        },
        in() {
          return builder
        },
        single() {
          return builder
        },
        then<TResult1 = ScriptedResponse, TResult2 = never>(
          onfulfilled?: ((value: ScriptedResponse) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          const response = script[`${table}:${operation}`]?.shift() || { data: [], error: null }
          return Promise.resolve(response).then(onfulfilled, onrejected)
        },
      }

      return builder
    },
  }
}

describe('combo domain pricing and stock', () => {
  beforeEach(() => {
    getSupabaseEcommerceMock.mockReset()
  })

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

  it('keeps inactive hydrated combos unavailable even when components have stock', async () => {
    const supabase = createComboHydrationSupabase({
      product_combo_components: [
        {
          data: [
            { combo_id: 'combo-inactive', product_id: 'coffee-250g', variant_id: null, quantity: 1 },
            { combo_id: 'combo-inactive', product_id: 'mug', variant_id: null, quantity: 1 },
          ],
          error: null,
        },
      ],
      store_items: [
        {
          data: [
            {
              id: 'coffee-250g',
              item_name: 'Café 250g',
              base_price: 30000,
              currency_code: 'COP',
              track_inventory: true,
              inventory_quantity: 10,
              is_active: true,
              is_available_for_sale: true,
            },
            {
              id: 'mug',
              item_name: 'Mug',
              base_price: 20000,
              currency_code: 'COP',
              track_inventory: true,
              inventory_quantity: 10,
              is_active: true,
              is_available_for_sale: true,
            },
          ],
          error: null,
        },
      ],
    })

    const [combo] = await hydrateCombos(
      [
        {
          id: 'combo-inactive',
          name: 'Combo inactivo',
          discount_type: 'percentage',
          discount_value: 0,
          is_active: false,
        },
      ],
      supabase,
    )

    expect(combo.availability.isAvailable).toBe(false)
    expect(combo.isActive).toBe(false)
  })

  it('defers combo image upload until save and surfaces storage failure before persistence', async () => {
    const file = { name: 'combo.png' } as File
    const uploadImage = vi.fn().mockResolvedValue({
      success: false,
      error: 'new row violates row-level security policy',
    })

    await expect(
      resolveDeferredImageUpload({
        file,
        imageUrl: 'https://example.com/old.png',
        uploadImage,
      }),
    ).rejects.toThrow('new row violates row-level security policy')

    expect(uploadImage).toHaveBeenCalledWith(file, 'product-images')
  })

  it('uses an existing combo image URL without uploading a file', async () => {
    const uploadImage = vi.fn()

    await expect(
      resolveDeferredImageUpload({
        imageUrl: ' https://example.com/combo.jpg ',
        uploadImage,
      }),
    ).resolves.toEqual({ imageUrl: 'https://example.com/combo.jpg' })

    expect(uploadImage).not.toHaveBeenCalled()
  })

  it('rolls component replacement back when combo update fails after deferred image upload', async () => {
    const operations: MutationOperation[] = []
    const existingComponentRows = [
      {
        id: 'old-row-1',
        combo_id: 'combo-1',
        product_id: 'old-coffee',
        variant_id: null,
        quantity: 1,
        display_order: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]
    const supabase = createComboMutationSupabase(
      {
        'product_combos:select': [{ data: { store_id: 'store-1' }, error: null }],
        'store_items:select': [
          {
            data: [
              {
                id: 'coffee-250g',
                store_id: 'store-1',
                item_name: 'Café 250g',
                is_active: true,
                is_available_for_sale: true,
              },
              {
                id: 'mug',
                store_id: 'store-1',
                item_name: 'Mug',
                is_active: true,
                is_available_for_sale: true,
              },
            ],
            error: null,
          },
        ],
        'item_variants:select': [{ data: [], error: null }],
        'product_combo_components:select': [{ data: existingComponentRows, error: null }],
        'product_combo_components:delete': [{ error: null }, { error: null }],
        'product_combo_components:insert': [{ error: null }, { error: null }],
        'product_combos:update': [{ error: { message: 'RLS bloqueó la actualización del combo' } }],
      },
      operations,
    )
    getSupabaseEcommerceMock.mockReturnValue(supabase as any)

    const result = await updateCombo('combo-1', {
      name: 'Combo actualizado',
      image_url: 'https://cdn.example.com/new-combo.png',
      discount_type: 'percentage',
      discount_value: 10,
      components: [
        { product_id: 'coffee-250g', quantity: 1 },
        { product_id: 'mug', quantity: 1 },
      ],
    })

    expect(result).toEqual({ success: false, error: 'RLS bloqueó la actualización del combo' })
    expect(operations.map((operation) => `${operation.table}:${operation.operation}`)).toEqual([
      'product_combo_components:delete',
      'product_combo_components:insert',
      'product_combos:update',
      'product_combo_components:delete',
      'product_combo_components:insert',
    ])
    expect(operations.at(-1)?.payload).toEqual([
      {
        combo_id: 'combo-1',
        product_id: 'old-coffee',
        variant_id: null,
        quantity: 1,
        display_order: 0,
      },
    ])
  })
})
