import type {
  ComboAvailabilityTrace,
  ComboComponentPriceInput,
  ComboComponentSnapshot,
  ComboDiscountConfig,
  ComboDiscountType,
  ComboPricingTrace,
} from './types'

export const COMBO_DISCOUNT_TYPES = ['percentage', 'fixed_cop'] as const satisfies readonly ComboDiscountType[]

export function clampComboDiscount(
  subtotal: number,
  discount: ComboDiscountConfig,
): { discountType: ComboDiscountType; discountValue: number; discountAmount: number } {
  const safeSubtotal = Math.max(0, finiteMoney(subtotal))
  const safeValue = Math.max(0, finiteMoney(discount.value))

  if (discount.type === 'percentage') {
    const percentage = Math.min(100, safeValue)
    return {
      discountType: 'percentage',
      discountValue: percentage,
      discountAmount: roundMoney((safeSubtotal * percentage) / 100),
    }
  }

  return {
    discountType: 'fixed_cop',
    discountValue: safeValue,
    discountAmount: Math.min(safeSubtotal, safeValue),
  }
}

export function calculateComboPricing(
  components: ComboComponentPriceInput[],
  discount: ComboDiscountConfig,
  fallbackCurrencyCode = 'COP',
): ComboPricingTrace {
  const snapshots: ComboComponentSnapshot[] = components.map((component) => {
    const quantity = Math.max(1, Math.floor(finiteMoney(component.quantity)))
    const unitPrice = Math.max(0, finiteMoney(component.unitPrice))

    return {
      ...component,
      quantity,
      unitPrice,
      lineSubtotal: roundMoney(unitPrice * quantity),
      currencyCode: component.currencyCode || fallbackCurrencyCode,
    }
  })

  const componentSubtotal = roundMoney(
    snapshots.reduce((total, component) => total + component.lineSubtotal, 0),
  )
  const clampedDiscount = clampComboDiscount(componentSubtotal, discount)
  const finalUnitPrice = roundMoney(componentSubtotal - clampedDiscount.discountAmount)

  return {
    componentSubtotal,
    ...clampedDiscount,
    finalUnitPrice,
    currencyCode: snapshots[0]?.currencyCode || fallbackCurrencyCode,
    components: snapshots,
  }
}

export function deriveComboAvailability(
  components: ComboComponentPriceInput[],
  requestedCombos = 1,
): ComboAvailabilityTrace {
  const safeRequestedCombos = Math.max(1, Math.floor(finiteMoney(requestedCombos)))
  const blockingComponents: ComboAvailabilityTrace['blockingComponents'] = []
  const finiteStocks: number[] = []

  for (const component of components) {
    const componentQuantity = Math.max(1, Math.floor(finiteMoney(component.quantity)))
    const requiredQuantity = componentQuantity * safeRequestedCombos
    const componentUnavailable = component.isAvailable === false
    const tracksInventory = component.trackInventory === true || component.availableQuantity !== null

    if (component.trackInventory === true && typeof component.availableQuantity === 'number') {
      finiteStocks.push(Math.floor(component.availableQuantity / componentQuantity))
    }

    if (componentUnavailable) {
      blockingComponents.push({
        productId: component.productId,
        variantId: component.variantId,
        productName: component.productName,
        requiredQuantity,
        availableQuantity: 0,
        message: `${component.productName} no está disponible para el combo`,
      })
      continue
    }

    if (!tracksInventory || component.trackInventory !== true) {
      continue
    }

    const availableQuantity = Math.max(0, component.availableQuantity ?? 0)
    if (availableQuantity < requiredQuantity) {
      blockingComponents.push({
        productId: component.productId,
        variantId: component.variantId,
        productName: component.productName,
        requiredQuantity,
        availableQuantity,
        message: `El combo requiere ${requiredQuantity} de ${component.productName}, pero solo hay ${availableQuantity}`,
      })
    }
  }

  return {
    isAvailable: blockingComponents.length === 0,
    derivedStock: finiteStocks.length > 0 ? Math.max(0, Math.min(...finiteStocks)) : null,
    blockingComponents,
  }
}

export function buildComboOrderSnapshot(input: {
  comboId: string
  name: string
  slug?: string | null
  description?: string | null
  imageUrl?: string | null
  isActive: boolean
  pricing: ComboPricingTrace
  availability: ComboAvailabilityTrace
  orderedQuantity: number
  capturedAt?: string
}) {
  return {
    id: input.comboId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    imageUrl: input.imageUrl,
    isActive: input.isActive,
    pricing: input.pricing,
    availability: input.availability,
    components: input.pricing.components,
    chargedUnitPrice: input.pricing.finalUnitPrice,
    chargedLineTotal: roundMoney(input.pricing.finalUnitPrice * input.orderedQuantity),
    orderedQuantity: input.orderedQuantity,
    capturedAt: input.capturedAt || new Date().toISOString(),
  }
}

function finiteMoney(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
