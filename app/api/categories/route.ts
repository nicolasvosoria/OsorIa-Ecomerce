import { NextRequest, NextResponse } from 'next/server'
import { getCategories } from '@/lib/supabase/products-api'
import { getStoreId } from '@/lib/utils/store'

/**
 * API Route para obtener categorías activas
 * GET /api/categories
 */
export async function GET(_request: NextRequest) {
  try {
    // Obtener store_id
    let storeId: string | null = null
    
    try {
      storeId = await getStoreId()
    } catch (error) {
      // Si falla, continuar sin store_id
      console.warn('[Categories API] No se pudo obtener store_id:', error)
    }
    
    // Obtener categorías
    const categories = await getCategories(false, storeId || undefined)

    // Ordenar por display_order
    const sortedCategories = categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

    return NextResponse.json(sortedCategories)
  } catch (error) {
    console.error('[Categories API] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    )
  }
}

