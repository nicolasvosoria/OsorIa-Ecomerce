export type ComboDiscountType = 'percentage' | 'fixed_cop'

export interface ComboDiscountConfig {
  type: ComboDiscountType
  value: number
}

export interface ComboComponentPriceInput {
  productId: string
  productName: string
  productSku?: string | null
  variantId?: string | null
  variantTitle?: string | null
  unitPrice: number
  quantity: number
  currencyCode?: string
  productImageUrl?: string | null
  productSlug?: string | null
  trackInventory?: boolean
  availableQuantity?: number | null
  isAvailable?: boolean
}

export interface ComboComponentSnapshot extends ComboComponentPriceInput {
  lineSubtotal: number
}

export interface ComboPricingTrace {
  componentSubtotal: number
  discountType: ComboDiscountType
  discountValue: number
  discountAmount: number
  finalUnitPrice: number
  currencyCode: string
  components: ComboComponentSnapshot[]
}

export interface ComboAvailabilityTrace {
  isAvailable: boolean
  derivedStock: number | null
  blockingComponents: Array<{
    productId: string
    variantId?: string | null
    productName: string
    requiredQuantity: number
    availableQuantity: number
    message: string
  }>
}

export interface ComboCatalogDetails {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  imageUrl?: string | null
  isActive: boolean
  pricing: ComboPricingTrace
  availability: ComboAvailabilityTrace
  components: ComboComponentSnapshot[]
}

export interface ComboOrderSnapshot extends ComboCatalogDetails {
  chargedUnitPrice: number
  chargedLineTotal: number
  orderedQuantity: number
  capturedAt: string
}
