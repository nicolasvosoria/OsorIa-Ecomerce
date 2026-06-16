const PRODUCT_IMAGE_TYPE = 'product'

export type ProductImageInput = {
  primary_image_url?: string | null
  primary_image_alt?: string | null
}

export type ProductImageRow = {
  item_id: string
  image_url: string
  image_alt: string
  display_order: number
  image_type: typeof PRODUCT_IMAGE_TYPE
}

export function buildProductImageRows(
  itemId: string,
  itemName: string,
  input: ProductImageInput,
  additionalImages: string[] = []
): ProductImageRow[] {
  const rows: ProductImageRow[] = []

  const primaryImageUrl = input.primary_image_url?.trim()

  if (primaryImageUrl) {
    rows.push({
      item_id: itemId,
      image_url: primaryImageUrl,
      image_alt: input.primary_image_alt || itemName,
      display_order: 1,
      image_type: PRODUCT_IMAGE_TYPE,
    })
  }

  rows.push(
    ...additionalImages
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url, index) => ({
        item_id: itemId,
        image_url: url,
        image_alt: `${itemName} - Imagen ${index + 2}`,
        display_order: index + 2,
        image_type: PRODUCT_IMAGE_TYPE,
      }))
  )

  return rows
}
