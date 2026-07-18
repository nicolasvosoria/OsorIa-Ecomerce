"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import {
  createItem,
  updateItem,
  type CreateItemData,
  type UpdateItemData,
} from "@/lib/supabase/products-api"
import { getItemById } from "@/lib/supabase/products-read"
import { getValidCompareAtPrice } from "@/lib/products/pricing"
import type { ProductFormValues } from "@/lib/products/schemas"

const PRODUCTS_PATH = "/admin/products"

export async function createProductAction(
  input: ProductFormValues,
): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const { primaryImage, additionalImages } = splitProductImages(input.images)
  const data: CreateItemData = {
    ...buildSharedItemFields(input, primaryImage),
    store_id: storeId,
    metadata: buildCreateMetadata(input.ai_details),
  }

  const result = await createItem(data, additionalImages, supabase)
  if (result.success) {
    revalidatePath(PRODUCTS_PATH)
  }

  return { success: result.success, error: result.error }
}

export async function updateProductAction(
  id: string,
  input: ProductFormValues,
): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const existing = await getItemById(id, storeId, supabase)
  if (!existing) {
    return { success: false, error: "Producto no encontrado" }
  }

  const { primaryImage, additionalImages } = splitProductImages(input.images)
  const data: UpdateItemData = {
    ...buildSharedItemFields(input, primaryImage),
    primary_image_url: primaryImage ?? null,
    primary_image_alt: primaryImage ? input.item_name.trim() : null,
    metadata: mergeUpdateMetadata(existing.metadata, input.ai_details),
  }

  const result = await updateItem(id, data, additionalImages, storeId, supabase)
  if (result.success) {
    revalidatePath(PRODUCTS_PATH)
  }

  return { success: result.success, error: result.error }
}

export async function softDeleteProductAction(id: string): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const result = await updateItem(id, { is_active: false }, [], storeId, supabase)
  if (result.success) {
    revalidatePath(PRODUCTS_PATH)
  }

  return { success: result.success, error: result.error }
}

function splitProductImages(images: string[]): {
  primaryImage: string | undefined
  additionalImages: string[]
} {
  return {
    primaryImage: images[0],
    additionalImages: images.slice(1),
  }
}

function buildSharedItemFields(
  input: ProductFormValues,
  primaryImage: string | undefined,
) {
  return {
    item_name: input.item_name.trim(),
    item_code: input.item_code.trim() || undefined,
    item_description: input.item_description.trim() || undefined,
    category_id: input.category_id || undefined,
    base_price: Number.parseFloat(input.base_price),
    compare_at_price: getValidCompareAtPrice(input.base_price, input.compare_at_price),
    currency_code: input.currency_code,
    is_active: input.is_active,
    is_featured: input.is_featured,
    is_available_for_sale: input.is_available_for_sale,
    track_inventory: input.track_inventory,
    inventory_quantity: Number.parseInt(input.inventory_quantity, 10) || 0,
    low_stock_threshold: Number.parseInt(input.low_stock_threshold, 10) || 10,
    seo_title: input.seo_title.trim() || undefined,
    seo_description: input.seo_description.trim() || undefined,
    tags: parseTags(input.tags),
    primary_image_url: primaryImage,
    primary_image_alt: input.item_name.trim(),
    display_order: Number.parseInt(input.display_order, 10) || 0,
  }
}

function parseTags(tags: string): string[] | undefined {
  if (!tags) return undefined
  const parsed = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
  return parsed.length > 0 ? parsed : undefined
}

function buildCreateMetadata(aiDetails: string): Record<string, any> | undefined {
  const detail = aiDetails.trim()
  return detail ? { ai_details: detail } : undefined
}

function mergeUpdateMetadata(
  existingMetadata: Record<string, any> | undefined,
  aiDetails: string,
): Record<string, any> | undefined {
  const metadata: Record<string, any> = { ...(existingMetadata || {}) }
  const detail = aiDetails.trim()
  if (detail) {
    metadata.ai_details = detail
  } else {
    delete metadata.ai_details
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}
