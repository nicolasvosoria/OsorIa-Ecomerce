# 🏪 Guía de Implementación Multi-Tenant con Subdominios

Esta guía explica cómo implementar múltiples tiendas bajo diferentes subdominios en el mismo proyecto.

## 📋 Concepto

Permite tener múltiples tiendas independientes bajo el mismo dominio:
- `tienda1.tudominio.com` → Tienda de electrónicos
- `tienda2.tudominio.com` → Tienda de ropa
- `tienda3.tudominio.com` → Tienda de alimentos
- `admin.tudominio.com` → Panel de administración central

Cada subdominio:
- ✅ Tiene su propio catálogo de productos
- ✅ Tiene su propia configuración de estilos y temas
- ✅ Comparte la misma base de datos (con separación por `store_id`)
- ✅ Puede tener administradores específicos o compartidos

## 🏗️ Arquitectura

### 1. Base de Datos

Se agrega una tabla `stores` y se modifica la estructura existente para incluir `store_id`:

```
stores (nueva tabla)
├── id (UUID)
├── subdomain (VARCHAR, único)
├── store_name (VARCHAR)
├── domain (VARCHAR) - dominio principal
├── is_active (BOOLEAN)
└── metadata (JSONB)

store_items (modificada)
├── store_id (UUID, FK a stores) ← NUEVO
└── ... (resto de campos)

orders (modificada)
├── store_id (UUID, FK a stores) ← NUEVO
└── ... (resto de campos)

component_styles (modificada)
├── store_id (UUID, FK a stores) ← NUEVO
└── ... (resto de campos)
```

### 2. Middleware de Next.js

El middleware intercepta las peticiones y:
1. Extrae el subdominio de la URL
2. Busca la tienda correspondiente en la base de datos
3. Inyecta el `store_id` en el contexto de la aplicación
4. Redirige si el subdominio no existe o está inactivo

### 3. Context API

Un nuevo `StoreContext` proporciona:
- `currentStore`: Información de la tienda actual
- `storeId`: ID de la tienda para filtrar queries
- `isLoading`: Estado de carga

### 4. APIs Modificadas

Todas las APIs de productos, estilos, etc. se modifican para:
- Filtrar automáticamente por `store_id`
- Validar que el usuario tenga permisos en esa tienda

## 🚀 Implementación Paso a Paso

### Paso 1: Crear Tabla de Tiendas

Ejecuta el script SQL: `scripts/30-create-stores-table.sql`

### Paso 2: Modificar Tablas Existentes

Ejecuta los scripts de migración para agregar `store_id`:
- `scripts/31-add-store-id-to-products.sql`
- `scripts/32-add-store-id-to-orders.sql`
- `scripts/33-add-store-id-to-styles.sql`

### Paso 3: Crear Middleware

Crea `middleware.ts` en la raíz del proyecto para manejar subdominios.

### Paso 4: Crear Store Context

Crea `contexts/store-context.tsx` para manejar el estado de la tienda actual.

### Paso 5: Modificar APIs

Actualiza todas las APIs para filtrar por `store_id`.

### Paso 6: Configurar DNS

Configura los subdominios en tu proveedor DNS para apuntar al mismo servidor.

## 🔧 Configuración de Vercel

### Opción 1: Wildcard Domain (Recomendado)

1. En Vercel Dashboard → Settings → Domains
2. Agrega: `*.tudominio.com`
3. Esto captura todos los subdominios automáticamente

### Opción 2: Subdominios Individuales

Agrega cada subdominio manualmente:
- `tienda1.tudominio.com`
- `tienda2.tudominio.com`
- etc.

## 📝 Ejemplo de Uso

### Crear una Nueva Tienda

```sql
INSERT INTO stores (subdomain, store_name, domain, is_active)
VALUES ('electronica', 'Tienda de Electrónica', 'tudominio.com', true);
```

### Acceder a la Tienda

```
https://electronica.tudominio.com
```

### Filtrar Productos por Tienda

```typescript
// Automáticamente filtra por store_id del contexto
const products = await getItems({ storeId: currentStore.id });
```

## 🔐 Seguridad y Permisos

### Administradores por Tienda

Puedes tener:
- **Super Admin**: Acceso a todas las tiendas
- **Store Admin**: Acceso solo a su tienda específica
- **Store Manager**: Acceso limitado a una tienda

### Row Level Security (RLS)

Configura políticas RLS en Supabase para:
- Usuarios solo pueden ver productos de su tienda
- Administradores solo pueden editar su tienda
- Los pedidos se asocian automáticamente a la tienda correcta

## 🎨 Personalización por Tienda

Cada tienda puede tener:
- ✅ Tema personalizado
- ✅ Fuentes personalizadas
- ✅ Estilos de componentes únicos
- ✅ Logo y branding
- ✅ Configuración de checkout

## 📊 Consideraciones

### Rendimiento

- Usa índices en `store_id` para queries rápidas
- Considera caché por tienda
- Usa CDN para assets específicos de tienda

### Escalabilidad

- La base de datos puede crecer, pero está bien organizada
- Considera sharding si tienes muchas tiendas (100+)
- Monitorea el uso de recursos por tienda

### Costos

- Una sola instancia de Supabase para todas las tiendas
- Un solo deployment en Vercel
- Costos compartidos entre todas las tiendas

## 🐛 Troubleshooting

### El subdominio no funciona

1. Verifica que el DNS esté configurado correctamente
2. Verifica que la tienda exista en la base de datos
3. Revisa los logs del middleware

### Los productos no aparecen

1. Verifica que los productos tengan `store_id` asignado
2. Verifica que el `store_id` coincida con la tienda actual
3. Revisa las políticas RLS en Supabase

### Errores de permisos

1. Verifica que el usuario tenga permisos en la tienda
2. Revisa la tabla `user_profiles` y los roles
3. Verifica las políticas RLS

## 📚 Recursos Adicionales

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Vercel Wildcard Domains](https://vercel.com/docs/concepts/projects/domains/wildcard-domains)

---

¿Necesitas ayuda con la implementación? Revisa los scripts SQL y el código de ejemplo incluidos en este proyecto.



