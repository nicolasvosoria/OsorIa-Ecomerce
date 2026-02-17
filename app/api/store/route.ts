import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseEcommerce } from '@/lib/supabase/client'

/**
 * API Route para obtener información de una tienda
 * GET /api/store?subdomain=electronica
 * GET /api/store?id=uuid
 * 
 * Nota: Las rutas API son dinámicas por defecto en Next.js 16 con cacheComponents
 * Esta ruta no debe ser prerenderizada porque usa searchParams dinámicos
 */

export async function GET(request: NextRequest) {
  try {
    // Usar request.url para obtener searchParams de forma compatible con prerendering
    // Esto evita el error de "needs to bail out of prerendering"
    const url = new URL(request.url)
    const subdomain = url.searchParams.get('subdomain')
    const storeId = url.searchParams.get('id')

    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase no configurado' },
        { status: 500 }
      )
    }

    let store = null

    if (subdomain) {
      const { data, error } = await supabase
        .from('stores_legacy')
        .select('*')
        .eq('subdomain', subdomain)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        console.error('[Store API] Error al obtener tienda por subdominio:', error)
        return NextResponse.json(
          { error: 'Error al obtener tienda' },
          { status: 500 }
        )
      }
      store = data
    } else if (storeId) {
      const { data, error } = await supabase
        .from('stores_legacy')
        .select('*')
        .eq('id', storeId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        console.error('[Store API] Error al obtener tienda por ID:', error)
        return NextResponse.json(
          { error: 'Error al obtener tienda' },
          { status: 500 }
        )
      }
      store = data
    } else {
      return NextResponse.json(
        { error: 'Se requiere subdomain o id' },
        { status: 400 }
      )
    }

    if (!store) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('[Store API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}












