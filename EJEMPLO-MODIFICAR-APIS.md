# 📝 Ejemplo: Modificar APIs para Multi-Tenant

Este documento muestra cómo modificar las APIs existentes para que filtren automáticamente por `store_id`.

## 🔧 Modificar `products-api.ts`

### Antes (sin multi-tenant):

```typescript
export async function getItems(params: GetItemsParams = {}): Promise<GetItemsResult> {
  let query = supabase
    .from('store_items')
    .select('*, item_categories(*)', { count: 'exact' })
    .eq('is_active', is_active)
    // ... más filtros
}
```

### Después (con multi-tenant):

```typescript
import { getStoreId } from '@/lib/utils/store'

export async function getItems(params: GetItemsParams = {}): Promise<GetItemsResult> {
  // Obtener store_id del contexto o parámetros
  const storeId = params.store_id || await getStoreId()
  
  if (!storeId) {
    console.warn('[Products] No se pudo obtener store_id')
    return { items: [], total: 0, has_more: false }
  }

  let query = supabase
    .from('store_items')
    .select('*, item_categories(*)', { count: 'exact' })
    .eq('store_id', storeId) // ← FILTRAR POR TIENDA
    .eq('is_active', is_active)
    // ... más filtros
}
```

## 🔧 Crear Helper `lib/utils/store.ts`

```typescript
import { cookies, headers } from 'next/headers'

/**
 * Obtiene el store_id del contexto actual
 * Funciona tanto en servidor como en cliente
 */
export async function getStoreId(): Promise<string | null> {
  // En el servidor, obtener del header establecido por middleware
  if (typeof window === 'undefined') {
    const headersList = headers()
    const storeId = headersList.get('x-store-id')
    if (storeId) return storeId

    // Fallback: obtener de cookies
    const cookieStore = cookies()
    const storeIdCookie = cookieStore.get('store_id')
    if (storeIdCookie) return storeIdCookie.value
  } else {
    // En el cliente, obtener de cookies
    const cookies = document.cookie.split(';')
    const storeIdCookie = cookies.find(c => c.trim().startsWith('store_id='))
    if (storeIdCookie) {
      return storeIdCookie.split('=')[1]
    }
  }

  // Fallback: usar 'default'
  return 'default'
}

/**
 * Obtiene el store_id de forma síncrona (solo cliente)
 */
export function getStoreIdSync(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const storeIdCookie = cookies.find(c => c.trim().startsWith('store_id='))
  if (storeIdCookie) {
    return storeIdCookie.split('=')[1]
  }

  return 'default'
}
```

## 🔧 Modificar `styles-api.ts`

### Antes:

```typescript
export async function getComponentStyleByName(componentName: string) {
  const { data, error } = await supabase
    .from('component_styles')
    .select('*')
    .eq('component_name', componentName)
    .single()
}
```

### Después:

```typescript
import { getStoreId } from '@/lib/utils/store'

export async function getComponentStyleByName(
  componentName: string,
  storeId?: string
) {
  const currentStoreId = storeId || await getStoreId()
  
  if (!currentStoreId) {
    console.warn('[Styles] No se pudo obtener store_id')
    return null
  }

  const { data, error } = await supabase
    .from('component_styles')
    .select('*')
    .eq('component_name', componentName)
    .eq('store_id', currentStoreId) // ← FILTRAR POR TIENDA
    .single()
}
```

## 🔧 Modificar `orders-api.ts`

### Antes:

```typescript
export async function createOrder(data: CreateOrderData) {
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_email: data.customer_email,
      // ... más campos
    })
    .select()
    .single()
}
```

### Después:

```typescript
import { getStoreId } from '@/lib/utils/store'

export async function createOrder(data: CreateOrderData) {
  const storeId = await getStoreId()
  
  if (!storeId) {
    throw new Error('No se pudo obtener store_id')
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      store_id: storeId, // ← ASOCIAR PEDIDO A TIENDA
      customer_email: data.customer_email,
      // ... más campos
    })
    .select()
    .single()
}
```

## 🔧 Actualizar Tipos

### `lib/types/products.ts`:

```typescript
export interface GetItemsParams {
  store_id?: string // ← NUEVO
  category_id?: string
  is_active?: boolean
  // ... resto de campos
}
```

## 🔧 Usar en Componentes

### En un Server Component:

```typescript
import { getStoreId } from '@/lib/utils/store'
import { getItems } from '@/lib/supabase/products-api'

export default async function ProductsPage() {
  const storeId = await getStoreId()
  const { items } = await getItems({ store_id: storeId })
  
  return (
    <div>
      {items.map(item => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  )
}
```

### En un Client Component:

```typescript
'use client'

import { useStore } from '@/contexts/store-context'
import { getItems } from '@/lib/supabase/products-api'
import { useEffect, useState } from 'react'

export default function ProductsPage() {
  const { storeId } = useStore()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (storeId) {
      getItems({ store_id: storeId }).then(result => {
        setItems(result.items)
      })
    }
  }, [storeId])

  return (
    <div>
      {items.map(item => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  )
}
```

## 📋 Checklist de Modificaciones

- [ ] Crear `lib/utils/store.ts` con helpers
- [ ] Modificar `products-api.ts` para filtrar por `store_id`
- [ ] Modificar `styles-api.ts` para filtrar por `store_id`
- [ ] Modificar `orders-api.ts` para asociar pedidos a `store_id`
- [ ] Modificar `themes-api.ts` (si quieres temas por tienda)
- [ ] Modificar `fonts-api.ts` (si quieres fuentes por tienda)
- [ ] Actualizar tipos TypeScript
- [ ] Actualizar componentes para usar `store_id`
- [ ] Agregar `StoreProvider` al layout principal
- [ ] Probar con diferentes subdominios

## 🎯 Orden de Implementación Recomendado

1. **Ejecutar scripts SQL** (crear tablas y migrar datos)
2. **Crear middleware** (manejar subdominios)
3. **Crear StoreContext** (estado de tienda actual)
4. **Crear helpers** (`lib/utils/store.ts`)
5. **Modificar APIs** (una por una, empezando por productos)
6. **Actualizar componentes** (usar `store_id` en queries)
7. **Probar** (crear tiendas de prueba y verificar)

---

**Nota:** Estas modificaciones son compatibles con el código existente. Los productos existentes se asignarán automáticamente a la tienda 'default' durante la migración.



