export type StoreProductContextRow = {
  item_name: string | null
  item_description: string | null
  base_price: number | string | null
  currency_code: string | null
  metadata: unknown
}

const DEFAULT_CURRENCY_CODE = 'COP'
const DESCRIPTION_PREVIEW_LENGTH = 200
const PRODUCT_CONTEXT_HEADER =
  '\n\nInformación de productos de la tienda (usa SOLO esta información):'
const PRODUCT_CONTEXT_INSTRUCTIONS =
  '\n\nInstrucciones: Responde usando únicamente los productos listados. Para características, especificaciones, materiales o detalles, usa la sección "Detalles y características" cuando exista; si no, usa la descripción y el nombre.'
const STRICT_CATALOG_INSTRUCTION =
  "\n\nREGLA OBLIGATORIA para preguntas sobre productos: Responde SOLO con la información de la lista anterior (nombre, precio, descripción, Detalles y características). No inventes características, no uses textos de otra marca ni descripciones genéricas. Si un producto tiene 'Detalles y características', copia o parafrasea exactamente esa información al hablar de ese producto."

export function buildProductsContextFromList(
  products: StoreProductContextRow[],
  strictCatalog: boolean,
): string {
  if (products.length === 0) return ''

  const productsInfo = products.map(productContextEntry).join('\n\n')
  const strictInstruction = strictCatalog ? STRICT_CATALOG_INSTRUCTION : ''

  return `${PRODUCT_CONTEXT_HEADER}\n${productsInfo}${PRODUCT_CONTEXT_INSTRUCTIONS}${strictInstruction}`
}

function productContextEntry(product: StoreProductContextRow): string {
  const price = priceSummaryFor(product)
  const description = descriptionSummaryFor(product.item_description)
  const aiDetails = aiDetailsFrom(product.metadata)

  return [
    `- ${product.item_name ?? 'Producto sin nombre'}${price}`,
    description,
    aiDetails ? `  Detalles y características: ${aiDetails}` : '',
  ].filter(Boolean).join('\n')
}

function priceSummaryFor(product: StoreProductContextRow): string {
  if (!product.base_price) return ''

  return ` (Precio: ${product.base_price} ${product.currency_code || DEFAULT_CURRENCY_CODE})`
}

function descriptionSummaryFor(description: string | null): string {
  if (!description) return ''

  const summary = description.substring(0, DESCRIPTION_PREVIEW_LENGTH)
  const ellipsis = description.length > DESCRIPTION_PREVIEW_LENGTH ? '...' : ''

  return `  Descripción: ${summary}${ellipsis}`
}

function aiDetailsFrom(metadata: unknown): string {
  const metadataRecord = metadataRecordFrom(metadata)
  return typeof metadataRecord.ai_details === 'string' ? metadataRecord.ai_details : ''
}

function metadataRecordFrom(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}

  return metadata as Record<string, unknown>
}
