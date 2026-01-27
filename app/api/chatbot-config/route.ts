import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
    },
  })
}

async function getStoreIdFromServer(): Promise<string | null> {
  const disableMultiTenant = process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === 'true'
  if (disableMultiTenant) {
    return process.env.DEFAULT_STORE_ID || 'default'
  }

  try {
    const cookieStore = await cookies()
    const storeIdCookie = cookieStore.get('store_id')
    if (storeIdCookie) return storeIdCookie.value
  } catch (error) {
    return 'default'
  }
  
  return 'default'
}

// GET - Obtener configuración del chatbot
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 }
      )
    }

    const storeId = await getStoreIdFromServer()

    let query = supabase
      .from('stores')
      .select('metadata')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (storeId === 'default') {
      query = query.eq('subdomain', 'default')
    } else {
      query = query.eq('id', storeId)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return NextResponse.json(
        { error: "Tienda no encontrada" },
        { status: 404 }
      )
    }

    const metadata = (data.metadata as Record<string, any>) || {}
    const chatbotConfig = metadata.chatbot || null

    return NextResponse.json({ config: chatbotConfig })
  } catch (error) {
    console.error("[Chatbot Config API] Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST - Guardar configuración del chatbot
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json(
        { error: "Configuración requerida" },
        { status: 400 }
      )
    }

    const storeId = await getStoreIdFromServer()

    let query = supabase
      .from('stores')
      .select('id, metadata')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (storeId === 'default') {
      query = query.eq('subdomain', 'default')
    } else {
      query = query.eq('id', storeId)
    }

    const { data: storeData, error: fetchError } = await query.single()

    if (fetchError || !storeData) {
      return NextResponse.json(
        { error: "Tienda no encontrada" },
        { status: 404 }
      )
    }

    // Actualizar el metadata
    const metadata = (storeData.metadata as Record<string, any>) || {}
    metadata.chatbot = config

    const { error: updateError } = await supabase
      .from('stores')
      .update({ 
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeData.id)

    if (updateError) {
      console.error("[Chatbot Config API] Error al actualizar:", updateError)
      return NextResponse.json(
        { error: "Error al guardar configuración" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Chatbot Config API] Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
