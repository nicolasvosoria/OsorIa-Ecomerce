import { NextRequest, NextResponse } from 'next/server'
import { removeCartLines } from '@/lib/shopify/shopify'
import { getCart } from '@/components/cart/actions'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/constants'

/**
 * API Route para vaciar el carrito de Shopify
 * POST /api/cart/clear
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener el carrito actual
    const cart = await getCart()
    
    if (!cart || !cart.lines || cart.lines.length === 0) {
      return NextResponse.json({ success: true, message: 'Carrito ya está vacío' })
    }
    
    // Obtener el cartId de las cookies
    const cartId = (await cookies()).get('cartId')?.value
    
    if (!cartId) {
      return NextResponse.json({ success: true, message: 'No hay carrito para limpiar' })
    }
    
    // Obtener todos los IDs de las líneas del carrito
    const lineIds = cart.lines.map(line => line.id)
    
    // Eliminar todas las líneas del carrito
    await removeCartLines(cartId, lineIds)
    
    // Revalidar el tag del carrito para forzar la recarga
    try {
      (revalidateTag as any)(TAGS.cart)
    } catch (error) {
      // Ignorar errores de revalidación
      console.warn('[Cart Clear API] Error revalidando tag:', error)
    }
    
    return NextResponse.json({ success: true, message: 'Carrito vaciado exitosamente' })
  } catch (error) {
    console.error('[Cart Clear API] Error:', error)
    // No fallar si Shopify no está configurado
    return NextResponse.json(
      { success: true, message: 'Carrito local limpiado (Shopify puede no estar configurado)' },
      { status: 200 }
    )
  }
}

