import type { CommerceProductPrice } from "@/lib/types/products"

const DEFAULT_PRICE_LOCALE = "es-CO"
const DEFAULT_CURRENCY = "COP"

const INVALID_COMPARE_AT_PRICE_NOTICE =
  "El precio anterior debe ser mayor al precio de venta actual para mostrar descuento. Se guardará sin precio tachado."

function parseProductPrice(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null

  const numericValue = typeof value === "number" ? value : Number.parseFloat(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function formatCommercePrice(
  amount: number | string | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY,
): string {
  const numericAmount = parseProductPrice(amount) ?? 0

  return new Intl.NumberFormat(DEFAULT_PRICE_LOCALE, {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount)
}

export function resolveCommercePrice(params: {
  amount: number | string | null | undefined
  currencyCode?: string | null
  compareAtAmount?: number | string | null
}): CommerceProductPrice {
  const amount = parseProductPrice(params.amount) ?? 0
  const currencyCode = params.currencyCode || DEFAULT_CURRENCY
  const compareAtAmount = parseProductPrice(params.compareAtAmount)
  const hasDiscount = compareAtAmount !== null && compareAtAmount > amount
  const savingsAmount = hasDiscount ? compareAtAmount - amount : undefined
  const discountPercent =
    hasDiscount && compareAtAmount > 0
      ? Math.round(((compareAtAmount - amount) / compareAtAmount) * 100)
      : undefined
  const savingsLabel =
    savingsAmount !== undefined && discountPercent !== undefined
      ? `Ahorra ${formatCommercePrice(savingsAmount, currencyCode)} (${discountPercent}%)`
      : undefined

  return {
    amount,
    currencyCode,
    label: formatCommercePrice(amount, currencyCode),
    compareAtAmount: hasDiscount ? compareAtAmount : undefined,
    compareAtLabel: hasDiscount ? formatCommercePrice(compareAtAmount, currencyCode) : undefined,
    savingsLabel,
    discountPercent,
    hasDiscount,
    hasInvalidComparison: compareAtAmount !== null && compareAtAmount <= amount,
  }
}

export function getAdminCompareAtPriceNotice(
  basePrice: number | string | null | undefined,
  compareAtPrice?: number | string | null,
): string | null {
  const baseAmount = parseProductPrice(basePrice)
  const compareAmount = parseProductPrice(compareAtPrice)

  if (baseAmount === null || compareAmount === null) return null
  return compareAmount <= baseAmount ? INVALID_COMPARE_AT_PRICE_NOTICE : null
}

export function getValidCompareAtPrice(
  basePrice: number | string | null | undefined,
  compareAtPrice?: number | string | null,
): number | undefined {
  const baseAmount = parseProductPrice(basePrice)
  const compareAmount = parseProductPrice(compareAtPrice)

  if (baseAmount === null || compareAmount === null || compareAmount <= baseAmount) {
    return undefined
  }

  return compareAmount
}
