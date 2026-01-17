# 🍰 Cómo Funciona el Subdominio de Repostería

Esta guía explica paso a paso cómo funciona el sistema multi-tienda usando el ejemplo de la tienda de repostería.

## 🔄 Flujo Completo del Subdominio

### 1️⃣ **Usuario Accede a la URL**

Cuando un usuario accede a:
```
http://reposteria.localhost:3000
```

### 2️⃣ **Middleware Detecta el Subdominio** (`middleware.ts`)

El middleware de Next.js se ejecuta **antes** de que la página se cargue:

```typescript
// middleware.ts línea 17-26
function getSubdomain(hostname: string): string | null {
  // En desarrollo local: reposteria.localhost
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.')
    // parts = ['reposteria', 'localhost']
    if (parts.length > 1 && parts[0] !== 'localhost') {
      return parts[0] // Retorna: 'reposteria'
    }
    return 'default'
  }
  // ... lógica para producción
}
```

**Resultado**: Extrae `'reposteria'` del hostname.

### 3️⃣ **Middleware Consulta Supabase**

El middleware llama a la función RPC de Supabase:

```typescript
// middleware.ts línea 64-102
async function getStoreBySubdomain(subdomain: string) {
  // Llama a: /rest/v1/rpc/get_store_by_subdomain?p_subdomain=reposteria
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_store_by_subdomain?p_subdomain=reposteria`
  )
  // Retorna los datos de la tienda desde la tabla 'stores'
}
```

**Consulta SQL en Supabase**:
```sql
SELECT * FROM stores WHERE subdomain = 'reposteria' AND is_active = TRUE
```

**Datos retornados** (ejemplo):
```json
{
  "id": "uuid-de-reposteria",
  "subdomain": "reposteria",
  "store_name": "Tienda de Repostería",
  "primary_color": "#FF6B9D",
  "secondary_color": "#FFE5F1",
  "is_active": true,
  "is_public": true
}
```

### 4️⃣ **Middleware Establece Headers y Cookie**

Si la tienda existe y está activa, el middleware:

```typescript
// middleware.ts línea 157-168
const response = NextResponse.next()

// 1. Establece headers HTTP
response.headers.set('x-store-id', store.id)
response.headers.set('x-store-subdomain', 'reposteria')
response.headers.set('x-store-name', 'Tienda de Repostería')

// 2. Establece cookie para persistir
response.cookies.set('store_id', store.id, {
  path: '/',
  maxAge: 60 * 60 * 24 * 7 // 7 días
})
```

**Headers disponibles en toda la aplicación**:
- `x-store-id`: UUID de la tienda
- `x-store-subdomain`: `'reposteria'`
- `x-store-name`: `'Tienda de Repostería'`

### 5️⃣ **StoreProvider Carga la Tienda** (`contexts/store-context.tsx`)

En el cliente (navegador), el `StoreProvider`:

```typescript
// store-context.tsx línea 34-78
const loadStore = async () => {
  // 1. Intenta obtener store_id de la cookie (establecida por middleware)
  const storeId = getCookie('store_id')
  
  // 2. Si no hay cookie, obtiene el subdominio del hostname
  const subdomain = getSubdomain(hostname) // 'reposteria'
  
  // 3. Llama a la API: /api/store?subdomain=reposteria
  const response = await fetch(`/api/store?subdomain=reposteria`)
  const storeData = await response.json()
  
  // 4. Guarda en el estado de React
  setStore(storeData)
}
```

**Resultado**: El contexto `useStore()` ahora tiene acceso a los datos de la tienda.

### 6️⃣ **ReposteriaLayout Aplica Estilos Personalizados** (`app/reposteria-layout.tsx`)

El componente `ReposteriaLayout` detecta que es la tienda de repostería:

```typescript
// reposteria-layout.tsx línea 10-68
export function ReposteriaLayout({ children }) {
  const { store } = useStore() // Obtiene: { subdomain: 'reposteria', ... }
  
  useEffect(() => {
    // Verifica si es la tienda de repostería
    if (store?.subdomain === 'reposteria') {
      const root = document.documentElement
      
      // 1. Aplica colores personalizados
      root.style.setProperty('--primary', '#FF6B9D') // Rosa pastel
      root.style.setProperty('--secondary', '#FFE5F1') // Rosa claro
      root.style.setProperty('--background', '#FFFBF9') // Fondo crema
      
      // 2. Agrega clase CSS específica
      document.body.classList.add('reposteria-store')
      
      // 3. Carga fuentes elegantes
      // Playfair Display (serif) + Inter (sans-serif)
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display...'
      
      // 4. Aplica fuentes
      root.style.setProperty('--font-family-serif', '"Playfair Display", serif')
    }
  }, [store?.subdomain])
}
```

**Resultado**: La página ahora tiene:
- ✅ Colores personalizados (rosa pastel)
- ✅ Fuentes elegantes (Playfair Display)
- ✅ Clase CSS `reposteria-store` en el body

### 7️⃣ **Componentes Usan la Información de la Tienda**

Otros componentes pueden usar `useStore()`:

```typescript
// Ejemplo en cualquier componente
import { useStore } from "@/contexts/store-context"

function MyComponent() {
  const { store } = useStore()
  
  if (store?.subdomain === 'reposteria') {
    // Mostrar contenido específico de repostería
    return <div>🍰 Tienda de Postres</div>
  }
  
  return <div>Tienda General</div>
}
```

## 📊 Diagrama del Flujo

```
Usuario accede a: reposteria.localhost:3000
         │
         ▼
┌─────────────────────────────────────┐
│  MIDDLEWARE (middleware.ts)         │
│  1. Extrae subdominio: "reposteria"  │
│  2. Consulta Supabase RPC            │
│  3. Obtiene datos de la tienda       │
│  4. Establece headers y cookie       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  STORE PROVIDER (store-context.tsx)  │
│  1. Lee cookie o subdominio          │
│  2. Llama a /api/store               │
│  3. Guarda en estado React           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  REPOSTERIA LAYOUT                  │
│  1. Detecta subdomain === 'reposteria'│
│  2. Aplica colores personalizados    │
│  3. Carga fuentes elegantes          │
│  4. Agrega clase CSS                 │
└─────────────────────────────────────┘
         │
         ▼
    Página renderizada
    con estilos de repostería
```

## 🗄️ Datos en Supabase

### Tabla `stores`

La tienda de repostería está almacenada así:

```sql
SELECT * FROM stores WHERE subdomain = 'reposteria';
```

**Resultado**:
| id | subdomain | store_name | primary_color | secondary_color | is_active |
|----|-----------|------------|---------------|-----------------|-----------|
| uuid | reposteria | Tienda de Repostería | #FF6B9D | #FFE5F1 | true |

### Función RPC `get_store_by_subdomain`

Esta función en Supabase busca la tienda:

```sql
CREATE FUNCTION get_store_by_subdomain(p_subdomain VARCHAR)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM stores
  WHERE subdomain = p_subdomain
    AND is_active = TRUE
    AND deleted_at IS NULL;
END;
$$;
```

## 🎨 Personalización Específica de Repostería

### 1. **Colores** (definidos en `reposteria-layout.tsx`)

```typescript
primary_color: '#FF6B9D'      // Rosa pastel
secondary_color: '#FFE5F1'    // Rosa claro
background: '#FFFBF9'         // Fondo crema
foreground: '#2D1B1B'         // Texto marrón oscuro
```

### 2. **Fuentes** (cargadas dinámicamente)

- **Serif**: `Playfair Display` (para títulos elegantes)
- **Sans-serif**: `Inter` (para texto general)

### 3. **Clase CSS**

El body tiene la clase `reposteria-store` que permite estilos específicos:

```css
.reposteria-store {
  /* Estilos específicos para repostería */
}
```

### 4. **Título Dinámico** (`components/dynamic-title.tsx`)

```typescript
const SUBDOMAIN_TITLES = {
  reposteria: "Tienda de Postres",
  // ...
}
```

### 5. **Favicon Dinámico** (`components/dynamic-favicon.tsx`)

Intenta cargar: `/favicon-reposteria.ico` si existe, sino usa el por defecto.

## 🔍 Verificación en el Navegador

Para verificar que todo funciona:

1. **Abre Developer Tools** (F12)
2. **Ve a Network → Headers**:
   - Busca `x-store-id`: UUID de la tienda
   - Busca `x-store-subdomain`: `reposteria`
   - Busca `x-store-name`: `Tienda de Repostería`

3. **Ve a Application → Cookies**:
   - Busca `store_id`: UUID de la tienda

4. **Ve a Console**:
   - Deberías ver logs de `[Store]` y `[Theme]`

## 📝 Resumen

1. **URL**: `reposteria.localhost:3000`
2. **Middleware**: Extrae `'reposteria'` y consulta Supabase
3. **Supabase**: Retorna datos de la tienda con `subdomain = 'reposteria'`
4. **Headers/Cookie**: Se establecen para toda la aplicación
5. **StoreProvider**: Carga y guarda los datos en React
6. **ReposteriaLayout**: Detecta `subdomain === 'reposteria'` y aplica estilos
7. **Resultado**: Página con colores, fuentes y estilos personalizados de repostería

## 🚀 Crear Otra Tienda Similar

Para crear otra tienda (ej: "electrónica"):

1. **Crear en Supabase**:
   ```sql
   INSERT INTO stores (subdomain, store_name, ...)
   VALUES ('electronica', 'Tienda de Electrónica', ...);
   ```

2. **Agregar al archivo hosts**:
   ```
   127.0.0.1    electronica.localhost
   ```

3. **Crear layout personalizado** (opcional):
   ```typescript
   // app/electronica-layout.tsx
   if (store?.subdomain === 'electronica') {
     // Aplicar estilos de electrónica
   }
   ```

4. **Acceder**: `http://electronica.localhost:3000`

¡Y listo! El sistema funciona automáticamente. 🎉
