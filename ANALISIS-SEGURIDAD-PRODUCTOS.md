# 🔒 Análisis de Seguridad - Página de Productos del Dashboard

## 📋 Resumen Ejecutivo

Este documento analiza el estado de seguridad de la página de gestión de productos (`/admin/products`) y sus operaciones relacionadas (crear, editar, eliminar).

---

## ✅ **ASPECTOS SEGUROS (Bien Implementados)**

### 1. **Autenticación y Autorización**

#### ✅ **Verificación de Permisos**
- **Ubicación:** `contexts/admin-permissions-context.tsx`
- **Implementación:**
  - Usa `useAdminPermissions()` para verificar rol de administrador
  - Consulta `user_profiles.role === 'admin'` en Supabase
  - Verifica autenticación con `supabase.auth.getUser()`

#### ✅ **Protección de Rutas**
- **Redirección automática:** Si no es admin, redirige a `/`
- **Mensaje de acceso denegado:** Muestra UI clara cuando no hay permisos
- **Verificación en múltiples niveles:**
  - Cliente: `useAdminPermissions()`
  - Contexto: `AdminPermissionsProvider`

**Estado:** ✅ **SEGURO** - Bien implementado

---

### 2. **Protección contra SQL Injection**

#### ✅ **Uso de Supabase Client**
- **Ubicación:** `lib/supabase/products-api.ts`
- **Implementación:**
  - Usa Supabase Client que parametriza queries automáticamente
  - No hay concatenación de strings SQL
  - Queries tipo: `.eq('id', itemId)` (parametrizado)

**Ejemplo seguro:**
```typescript
const { data } = await supabase
  .from('store_items')
  .select('*')
  .eq('id', itemId)  // ✅ Parametrizado, seguro
  .single()
```

**Estado:** ✅ **SEGURO** - Supabase protege automáticamente

---

### 3. **Multi-Tenant Security**

#### ✅ **Filtrado por Store ID**
- **Ubicación:** `lib/supabase/products-api.ts`
- **Implementación:**
  - Todos los queries filtran por `store_id`
  - Previene acceso cruzado entre tiendas
  - Obtiene `store_id` de forma segura (cookie/header)

**Ejemplo:**
```typescript
query = query.eq('store_id', currentStoreId!) // ✅ Filtrado por tienda
```

**Estado:** ✅ **SEGURO** - Aislamiento de datos por tienda

---

### 4. **Validación Básica de Datos**

#### ✅ **Validaciones en Cliente**
- **Ubicación:** `app/admin/products/create/page.tsx`, `edit/page.tsx`
- **Validaciones implementadas:**
  - Nombre requerido: `item_name.trim()`
  - Precio positivo: `parseFloat(base_price) > 0`
  - Stock no negativo: `inventory_quantity >= 0`
  - Límite de imágenes: `images.length <= 3`

**Estado:** ✅ **PARCIALMENTE SEGURO** - Validación básica presente

---

## ⚠️ **VULNERABILIDADES Y RIESGOS**

### 🔴 **CRÍTICAS (Alta Prioridad)**

#### 1. **RLS (Row Level Security) DESHABILITADO**

**Problema:**
```sql
-- En scripts/20-create-products-tables.sql línea 253
ALTER TABLE IF EXISTS public.store_items DISABLE ROW LEVEL SECURITY;
```

**Impacto:**
- ❌ **Sin protección a nivel de base de datos**
- ❌ Si alguien obtiene acceso a Supabase directamente, puede leer/modificar todos los productos
- ❌ No hay validación en la base de datos de permisos
- ❌ Dependencia total de validación en cliente (puede ser bypassed)

**Riesgo:** 🔴 **ALTO** - Si se compromete la API key, no hay protección adicional

**Recomendación:**
```sql
-- Habilitar RLS
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver productos de su tienda
CREATE POLICY "Admins can view their store items"
  ON public.store_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND store_id = (
      SELECT id FROM public.stores
      WHERE id = store_items.store_id
    )
  );

-- Política: Solo admins pueden insertar
CREATE POLICY "Admins can insert items"
  ON public.store_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo admins pueden actualizar
CREATE POLICY "Admins can update items"
  ON public.store_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

#### 2. **Falta de Validación en el Servidor**

**Problema:**
- Las validaciones solo están en el cliente
- No hay API routes que validen antes de guardar
- Un atacante podría hacer requests directos a Supabase

**Impacto:**
- ❌ Se pueden insertar datos inválidos
- ❌ Se pueden modificar productos sin validación
- ❌ No hay límites de tamaño de campos
- ❌ No hay sanitización de HTML en descripciones

**Riesgo:** 🔴 **ALTO** - Datos corruptos o maliciosos pueden entrar

**Recomendación:**
- Crear API routes (`/api/products/create`, `/api/products/update`)
- Validar en servidor antes de guardar
- Usar esquemas de validación (Zod, Yup)

```typescript
// Ejemplo: app/api/products/create/route.ts
import { z } from 'zod'

const productSchema = z.object({
  item_name: z.string().min(1).max(255),
  base_price: z.number().positive().max(999999),
  item_description: z.string().max(5000).optional(),
  // ...
})

export async function POST(request: NextRequest) {
  // Validar en servidor
  const body = await request.json()
  const validated = productSchema.parse(body)
  // ...
}
```

---

#### 3. **Falta de Sanitización de HTML/XSS**

**Problema:**
- `item_description` y `ai_details` se guardan sin sanitizar
- `item_description_html` se genera automáticamente sin sanitización
- No hay protección contra XSS en campos de texto

**Impacto:**
- ❌ Scripts maliciosos pueden inyectarse
- ❌ Ataques XSS en descripciones de productos
- ❌ Posible robo de cookies/tokens

**Riesgo:** 🔴 **ALTO** - Vulnerabilidad XSS

**Recomendación:**
```typescript
import DOMPurify from 'isomorphic-dompurify'

// Sanitizar HTML antes de guardar
const sanitizedDescription = DOMPurify.sanitize(formData.item_description)
const sanitizedHtml = `<p>${sanitizedDescription.replace(/\n/g, '<br>')}</p>`
```

---

#### 4. **Exposición de Información en Errores**

**Problema:**
```typescript
console.error("[Admin Products] Error al cargar productos:", error)
// Error completo se muestra en consola del navegador
```

**Impacto:**
- ❌ Stack traces visibles en DevTools
- ❌ Información de estructura de BD
- ❌ Posibles rutas de archivos expuestas

**Riesgo:** 🟡 **MEDIO** - Información sensible expuesta

**Recomendación:**
```typescript
// En producción, solo loggear IDs de error
if (process.env.NODE_ENV === 'production') {
  console.error("[Admin Products] Error ID:", errorId)
  // Enviar error completo a servicio de logging (Sentry, etc.)
} else {
  console.error("[Admin Products] Error:", error)
}
```

---

#### 5. **Falta de Rate Limiting**

**Problema:**
- No hay límite de requests por IP/usuario
- Se pueden hacer múltiples requests simultáneos
- Posible DoS o abuso de API

**Impacto:**
- ❌ Ataques de fuerza bruta
- ❌ Sobrecarga del servidor
- ❌ Costos elevados de API

**Riesgo:** 🟡 **MEDIO** - Abuso de recursos

**Recomendación:**
- Implementar rate limiting en Next.js middleware
- Usar servicios como Upstash Redis
- Limitar: 10 requests/minuto por usuario

---

### 🟡 **IMPORTANTES (Media Prioridad)**

#### 6. **Validación de Tipos Insuficiente**

**Problema:**
```typescript
base_price: parseFloat(formData.base_price)
// No valida si es NaN
// No valida rangos máximos
```

**Impacto:**
- ❌ Valores NaN pueden guardarse
- ❌ Precios extremadamente altos posibles
- ❌ Overflow de números

**Recomendación:**
```typescript
const price = parseFloat(formData.base_price)
if (isNaN(price) || price < 0 || price > 999999) {
  toast.error("Precio inválido")
  return
}
```

---

#### 7. **Falta de Validación de URLs de Imágenes**

**Problema:**
- `primary_image_url` se acepta sin validar
- No se verifica que sea una URL válida
- No se verifica dominio permitido

**Impacto:**
- ❌ URLs maliciosas posibles
- ❌ SSRF (Server-Side Request Forgery) si se procesa en servidor
- ❌ Imágenes de dominios no permitidos

**Recomendación:**
```typescript
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const allowedDomains = [
      'supabase.co',
      'yourdomain.com',
      // Solo dominios permitidos
    ]
    return allowedDomains.some(domain => parsed.hostname.endsWith(domain))
  } catch {
    return false
  }
}
```

---

#### 8. **Falta de CSRF Protection**

**Problema:**
- No hay tokens CSRF en formularios
- Requests pueden ser falsificados desde otros sitios

**Impacto:**
- ❌ Ataques CSRF posibles
- ❌ Modificación no autorizada de productos

**Riesgo:** 🟡 **MEDIO** - Requiere que el usuario esté autenticado

**Recomendación:**
- Next.js tiene protección CSRF por defecto en algunas rutas
- Verificar que todas las mutaciones la tengan
- Usar SameSite cookies

---

#### 9. **Validación de UUIDs**

**Problema:**
```typescript
// En edit page
const productId = params.id as string
// No valida que sea UUID válido
```

**Impacto:**
- ❌ IDs inválidos pueden causar errores
- ❌ Posible exposición de información en errores

**Recomendación:**
```typescript
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
```

---

#### 10. **Falta de Auditoría/Logging**

**Problema:**
- No se registra quién creó/modificó productos
- No hay historial de cambios
- Difícil rastrear actividad sospechosa

**Impacto:**
- ❌ No se puede auditar cambios
- ❌ Difícil detectar actividad maliciosa
- ❌ No hay trazabilidad

**Recomendación:**
- Agregar campos `created_by`, `updated_by`
- Tabla de auditoría para cambios importantes
- Logging de acciones administrativas

---

### 🟢 **MEJORAS (Baja Prioridad pero Importantes)**

#### 11. **Validación de Longitud de Campos**

**Problema:**
- No hay límites máximos en muchos campos
- `item_name` puede ser extremadamente largo
- `ai_details` no tiene límite

**Recomendación:**
```typescript
const MAX_NAME_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_AI_DETAILS_LENGTH = 10000

if (formData.item_name.length > MAX_NAME_LENGTH) {
  toast.error(`El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
  return
}
```

---

#### 12. **Validación de Categorías**

**Problema:**
- `category_id` se acepta sin verificar que exista
- No se verifica que la categoría pertenezca a la misma tienda

**Impacto:**
- ❌ Referencias a categorías inexistentes
- ❌ Asignación de categorías de otras tiendas

**Recomendación:**
```typescript
// Verificar que la categoría existe y pertenece a la tienda
if (formData.category_id) {
  const category = await getCategoryById(formData.category_id)
  if (!category || category.store_id !== currentStoreId) {
    toast.error("Categoría inválida")
    return
  }
}
```

---

#### 13. **Protección de Metadata**

**Problema:**
- `metadata` es un JSONB sin validación de estructura
- Se puede guardar cualquier cosa en metadata
- Posible inyección de datos maliciosos

**Recomendación:**
```typescript
// Validar estructura de metadata
const metadataSchema = z.object({
  ai_details: z.string().max(10000).optional(),
  // Solo campos permitidos
}).passthrough() // Permitir otros campos pero validar estructura
```

---

#### 14. **Validación de Slugs**

**Problema:**
- Slugs generados pueden tener caracteres especiales
- No se valida unicidad antes de intentar guardar
- Posibles conflictos

**Recomendación:**
```typescript
// Validar formato de slug
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length <= 255
}
```

---

#### 15. **Protección contra Enumeration**

**Problema:**
- IDs de productos son UUIDs predecibles
- Se puede intentar enumerar productos

**Impacto:**
- 🟢 **BAJO** - UUIDs son difíciles de adivinar
- Pero si se conoce un ID, se puede intentar acceder

**Recomendación:**
- Ya está bien (UUIDs son seguros)
- Agregar verificación de permisos en cada acceso

---

## 📊 **RESUMEN DE SEGURIDAD**

### **Puntuación General: 6/10** ⚠️

| Aspecto | Estado | Puntuación |
|---------|--------|-----------|
| Autenticación | ✅ Bueno | 9/10 |
| Autorización | ✅ Bueno | 8/10 |
| SQL Injection | ✅ Protegido | 10/10 |
| XSS Protection | ❌ Falta | 3/10 |
| Validación Servidor | ❌ Falta | 2/10 |
| RLS en BD | ❌ Deshabilitado | 0/10 |
| Rate Limiting | ❌ Falta | 0/10 |
| CSRF Protection | ⚠️ Parcial | 5/10 |
| Validación de Datos | ⚠️ Básica | 5/10 |
| Auditoría/Logging | ❌ Falta | 0/10 |

---

## 🎯 **PRIORIDADES DE SEGURIDAD**

### **Fase 1 (Crítico - Implementar Inmediatamente):**

1. ✅ **Habilitar RLS en Supabase**
   - Crear políticas para productos
   - Solo admins pueden CRUD
   - Filtrar por store_id

2. ✅ **Validación en Servidor**
   - Crear API routes para crear/editar
   - Validar con Zod/Yup
   - Rechazar datos inválidos

3. ✅ **Sanitización XSS**
   - Instalar DOMPurify
   - Sanitizar `item_description` y `ai_details`
   - Sanitizar HTML generado

### **Fase 2 (Importante - Próximas 2 semanas):**

4. ✅ **Rate Limiting**
   - Implementar en middleware
   - Limitar requests por usuario/IP

5. ✅ **Validación de URLs**
   - Validar URLs de imágenes
   - Whitelist de dominios permitidos

6. ✅ **Mejorar Manejo de Errores**
   - No exponer stack traces en producción
   - Usar servicio de logging (Sentry)

### **Fase 3 (Mejoras - Próximo mes):**

7. ✅ **Auditoría**
   - Campos `created_by`, `updated_by`
   - Tabla de historial de cambios

8. ✅ **Validaciones Avanzadas**
   - Límites de longitud
   - Validación de categorías
   - Validación de UUIDs

---

## 🔧 **IMPLEMENTACIONES RECOMENDADAS**

### 1. **Habilitar RLS (Prioridad Máxima)**

```sql
-- Habilitar RLS
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Solo admins de la misma tienda
CREATE POLICY "store_items_select_policy"
  ON public.store_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política de inserción: Solo admins
CREATE POLICY "store_items_insert_policy"
  ON public.store_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política de actualización: Solo admins de la misma tienda
CREATE POLICY "store_items_update_policy"
  ON public.store_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política de eliminación: Solo admins (soft delete)
CREATE POLICY "store_items_delete_policy"
  ON public.store_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

### 2. **API Route con Validación**

```typescript
// app/api/products/create/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/supabase/permissions-api"
import { createItem } from "@/lib/supabase/products-api"
import DOMPurify from 'isomorphic-dompurify'

const productSchema = z.object({
  item_name: z.string().min(1).max(255),
  item_code: z.string().max(100).optional(),
  item_description: z.string().max(5000).optional(),
  ai_details: z.string().max(10000).optional(),
  base_price: z.number().positive().max(999999),
  compare_at_price: z.number().positive().max(999999).optional(),
  // ... más campos
})

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar permisos
    await requireAdmin()

    // 2. Validar datos
    const body = await request.json()
    const validated = productSchema.parse(body)

    // 3. Sanitizar HTML
    if (validated.item_description) {
      validated.item_description = DOMPurify.sanitize(validated.item_description, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
      })
    }

    // 4. Crear producto
    const result = await createItem(validated)
    
    return NextResponse.json(result)
  } catch (error) {
    // Manejo seguro de errores
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    )
  }
}
```

---

### 3. **Rate Limiting**

```typescript
// middleware.ts (agregar)
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
})

export async function middleware(request: NextRequest) {
  // Aplicar rate limiting a rutas de admin
  if (request.nextUrl.pathname.startsWith('/admin/products')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)
    
    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes" },
        { status: 429 }
      )
    }
  }
  
  // ... resto del middleware
}
```

---

## 📝 **CHECKLIST DE SEGURIDAD**

### **Autenticación y Autorización**
- [x] Verificación de permisos en cliente
- [ ] Verificación de permisos en servidor
- [ ] Verificación de permisos en base de datos (RLS)
- [x] Redirección si no es admin

### **Validación de Datos**
- [x] Validación básica en cliente
- [ ] Validación completa en servidor
- [ ] Validación de tipos
- [ ] Validación de rangos
- [ ] Validación de longitud

### **Protección contra Ataques**
- [x] SQL Injection (Supabase protege)
- [ ] XSS (falta sanitización)
- [ ] CSRF (parcial)
- [ ] Rate Limiting (falta)
- [ ] SSRF (validar URLs)

### **Base de Datos**
- [ ] RLS habilitado
- [ ] Políticas de seguridad
- [ ] Índices para performance
- [ ] Backups regulares

### **Logging y Auditoría**
- [ ] Logging de acciones críticas
- [ ] Campos de auditoría (created_by, updated_by)
- [ ] Historial de cambios
- [ ] Manejo seguro de errores

---

## 🚨 **RIESGOS IDENTIFICADOS**

### **Riesgo Crítico:**
1. **RLS Deshabilitado** - Sin protección a nivel de BD
2. **Falta de Validación en Servidor** - Datos pueden ser manipulados
3. **XSS en Descripciones** - Scripts maliciosos posibles

### **Riesgo Medio:**
4. **Falta de Rate Limiting** - Abuso de API posible
5. **Exposición de Errores** - Información sensible en consola
6. **Validación Insuficiente** - Datos inválidos pueden guardarse

### **Riesgo Bajo:**
7. **Falta de Auditoría** - Difícil rastrear cambios
8. **Validación de URLs** - URLs maliciosas posibles

---

## 💡 **RECOMENDACIONES FINALES**

1. **Prioridad 1:** Habilitar RLS y crear políticas
2. **Prioridad 2:** Crear API routes con validación en servidor
3. **Prioridad 3:** Implementar sanitización XSS
4. **Prioridad 4:** Agregar rate limiting
5. **Prioridad 5:** Mejorar logging y auditoría

---

## 📚 **RECURSOS ADICIONALES**

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/routing/middleware#security)

---

**¿Quieres que implemente alguna de estas mejoras de seguridad específicamente?**
