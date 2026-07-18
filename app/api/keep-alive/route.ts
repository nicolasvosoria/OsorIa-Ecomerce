import { NextRequest, NextResponse } from 'next/server'

import { getServiceEcommerceClient } from '@/lib/supabase/service-client'

/**
 * Keep-alive anti-pausa (plan free de Supabase).
 *
 * El plan free pausa el proyecto tras 7 días sin actividad de base de datos.
 * Un Vercel Cron diario (ver `vercel.json`) golpea esta ruta, que hace una
 * lectura mínima al schema `ecommerce` — suficiente actividad para que Supabase
 * no marque el proyecto como inactivo. En Hobby el cron corre máx. 1×/día, de
 * sobra para la ventana de 7 días.
 *
 * Protegida con CRON_SECRET: Vercel adjunta `Authorization: Bearer <CRON_SECRET>`
 * a las invocaciones de cron cuando la variable está configurada en el proyecto.
 *
 * GET /api/keep-alive
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const supabase = getServiceEcommerceClient()
  if (!supabase) {
    console.error('[Keep-alive] Falta configuración de Supabase (URL / service role)')
    return NextResponse.json(
      { ok: false, error: 'Supabase no configurado' },
      { status: 500 },
    )
  }

  try {
    // Lectura mínima: toca la base para que cuente como actividad y no se pause.
    const { error } = await supabase.from('stores').select('id').limit(1)
    if (error) throw error

    return NextResponse.json({ ok: true, pinged: 'ecommerce.stores' })
  } catch (error) {
    console.error('[Keep-alive] Fallo el ping a la base:', error)
    return NextResponse.json(
      { ok: false, error: 'Fallo el ping a la base' },
      { status: 500 },
    )
  }
}
