"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import type { CategoryFormValues } from "@/lib/categories/schemas"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  updateCategory,
  type CategoryWriteData,
} from "@/lib/supabase/categories-api"

const CATEGORIES_PATH = "/admin/products/categories"

export async function createCategoryAction(input: CategoryFormValues): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const result = await createCategory(buildCategoryFields(input), storeId, supabase)
  if (result.success) {
    revalidatePath(CATEGORIES_PATH)
  }

  return { success: result.success, error: result.error }
}

export async function updateCategoryAction(
  id: string,
  input: CategoryFormValues,
): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const result = await updateCategory(id, buildCategoryFields(input), storeId, supabase)
  if (result.success) {
    revalidatePath(CATEGORIES_PATH)
  }

  return { success: result.success, error: result.error }
}

export async function deactivateCategoryAction(id: string): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const result = await deactivateCategory(id, storeId, supabase)
  if (result.success) {
    revalidatePath(CATEGORIES_PATH)
  }

  return { success: result.success, error: result.error }
}

export async function deleteCategoryAction(id: string): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const result = await deleteCategory(id, storeId, supabase)
  if (result.success) {
    revalidatePath(CATEGORIES_PATH)
  }

  return { success: result.success, error: result.error }
}

function buildCategoryFields(input: CategoryFormValues): CategoryWriteData {
  return {
    category_name: input.category_name,
    slug: input.slug || undefined,
    category_description: input.category_description || undefined,
    category_image_url: input.category_image_url || undefined,
    display_order: Number.parseInt(input.display_order, 10) || 0,
    is_active: input.is_active,
    seo_title: input.seo_title,
    seo_description: input.seo_description,
  }
}
