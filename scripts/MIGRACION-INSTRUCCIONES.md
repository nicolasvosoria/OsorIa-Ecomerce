# Instrucciones para Migración al Schema Ecommerce

Este documento explica cómo migrar los datos del schema `public` al nuevo schema `ecommerce` normalizado.

## 📋 Pre-requisitos

1. **Backup de la base de datos**: Asegúrate de tener un backup completo antes de ejecutar la migración.
2. **Acceso al SQL Editor de Supabase**: Necesitas permisos de administrador en Supabase.
3. **Schema ecommerce creado**: El schema `ecommerce` y todas sus tablas deben estar creadas.

## 🚀 Pasos para Ejecutar la Migración

### Paso 1: Verificar el Schema Ecommerce

Antes de migrar, verifica que el schema `ecommerce` esté completamente creado:

```sql
-- Verificar que el schema existe
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'ecommerce';

-- Verificar tablas principales
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'ecommerce'
ORDER BY table_name;
```

### Paso 2: Ejecutar el Script de Migración

1. Abre el **SQL Editor** en Supabase Dashboard
2. Abre el archivo `scripts/migrate-to-ecommerce-schema.sql`
3. **Revisa el script** para asegurarte de que está correcto
4. Ejecuta el script completo

El script:
- ✅ Usa transacciones (BEGIN/COMMIT) para poder hacer rollback si es necesario
- ✅ Usa `ON CONFLICT` para evitar duplicados
- ✅ Preserva los IDs originales cuando es posible
- ✅ Maneja correctamente los campos NULL
- ✅ Mapea los enums correctamente
- ✅ Crea las relaciones automáticamente

### Paso 3: Verificar la Migración

Ejecuta el script de verificación:

```sql
-- Ejecutar scripts/verify-migration.sql
```

Este script te mostrará:
- ✅ Conteos comparativos entre `public` y `ecommerce`
- ✅ Estado de cada tabla migrada
- ✅ Verificación de relaciones
- ✅ Verificación de integridad de datos

### Paso 4: Probar la Aplicación

Después de la migración:

1. **Prueba las consultas de lectura**: Verifica que las vistas legacy funcionen correctamente
2. **Prueba las operaciones de escritura**: Crea un pedido de prueba, actualiza un producto, etc.
3. **Verifica las estadísticas**: Revisa que las estadísticas en `/admin/stats` funcionen correctamente

## 📊 Datos que se Migran

### Tablas Principales
- ✅ `user_profiles` → `ecommerce.user_profiles`
- ✅ `item_categories` → `ecommerce.item_categories`
- ✅ `store_items` → `ecommerce.store_items`
- ✅ `item_variants` → `ecommerce.item_variants`
- ✅ `item_images` → `ecommerce.item_images`
- ✅ `orders` → `ecommerce.orders`
- ✅ `order_items` → `ecommerce.order_items`
- ✅ `component_styles` → `ecommerce.component_styles`
- ✅ `app_themes` → `ecommerce.app_themes`
- ✅ `app_fonts` → `ecommerce.app_fonts`

### Tablas Relacionadas (Creadas Automáticamente)
- ✅ `ecommerce.item_seo` (desde `store_items.seo_title`, `seo_description`)
- ✅ `ecommerce.item_metrics` (desde `store_items.view_count`)
- ✅ `ecommerce.item_tags` (desde `store_items.tags` array)
- ✅ `ecommerce.order_addresses` (desde `orders` campos de dirección)
- ✅ `ecommerce.payment_transactions` (desde `orders` campos de pago)
- ✅ `ecommerce.app_theme_versions` (para temas activos por tienda)

## ⚠️ Notas Importantes

### IDs Auto-generados
Las siguientes tablas tienen IDs auto-generados (`GENERATED ALWAYS AS IDENTITY`):
- `ecommerce.component_styles` (id: bigint)
- `ecommerce.app_themes` (id: bigint)
- `ecommerce.app_fonts` (id: bigint)

**Los IDs originales NO se preservan** para estas tablas, pero los datos se migran correctamente usando los campos únicos (`component_name`, `theme_name`, `font_name`).

### Campos que Cambiaron
- `orders.status`: Se mapea al enum `ecommerce.order_status`
- `orders.payment_status`: Se mapea al enum `ecommerce.payment_status`
- `store_items.tags`: Array se convierte en registros en `ecommerce.item_tags`
- `store_items.primary_image_url`: Se crea como registro en `ecommerce.item_images` con `display_order = 0`

### Relaciones
- Los pedidos (`orders`) ahora tienen direcciones en `ecommerce.order_addresses`
- Los pagos se registran en `ecommerce.payment_transactions`
- Los productos tienen SEO, métricas y tags en tablas separadas

## 🔄 Rollback (Si es Necesario)

Si necesitas revertir la migración:

1. **NO elimines los datos del schema `public`** (se mantienen intactos)
2. Los datos en `ecommerce` son independientes
3. Puedes eliminar los datos de `ecommerce` si es necesario:

```sql
-- ⚠️ CUIDADO: Esto elimina todos los datos del schema ecommerce
-- Solo ejecuta si realmente necesitas hacer rollback

BEGIN;

TRUNCATE TABLE ecommerce.order_items CASCADE;
TRUNCATE TABLE ecommerce.orders CASCADE;
TRUNCATE TABLE ecommerce.item_tags CASCADE;
TRUNCATE TABLE ecommerce.item_images CASCADE;
TRUNCATE TABLE ecommerce.item_seo CASCADE;
TRUNCATE TABLE ecommerce.item_metrics CASCADE;
TRUNCATE TABLE ecommerce.item_variants CASCADE;
TRUNCATE TABLE ecommerce.store_items CASCADE;
TRUNCATE TABLE ecommerce.item_categories CASCADE;
TRUNCATE TABLE ecommerce.component_styles CASCADE;
TRUNCATE TABLE ecommerce.app_theme_versions CASCADE;
TRUNCATE TABLE ecommerce.app_themes CASCADE;
TRUNCATE TABLE ecommerce.app_fonts CASCADE;
TRUNCATE TABLE ecommerce.user_profiles CASCADE;

COMMIT;
```

## ✅ Checklist Post-Migración

- [ ] Ejecutar script de verificación
- [ ] Verificar que todos los conteos coincidan
- [ ] Probar creación de pedido
- [ ] Probar actualización de producto
- [ ] Verificar estadísticas en `/admin/stats`
- [ ] Verificar que las vistas legacy funcionen
- [ ] Probar búsqueda de productos
- [ ] Verificar que los temas y fuentes se carguen correctamente

## 🆘 Solución de Problemas

### Error: "relation does not exist"
- Verifica que el schema `ecommerce` esté creado
- Verifica que todas las tablas existan

### Error: "duplicate key value"
- El script usa `ON CONFLICT`, pero si persiste, verifica que no haya datos duplicados en `public`

### Error: "invalid input syntax for type enum"
- Verifica que los valores de `status` y `payment_status` sean válidos
- El script mapea automáticamente, pero valores desconocidos pueden causar errores

### Datos faltantes después de la migración
- Ejecuta el script de verificación
- Compara los conteos
- Revisa los logs del script de migración

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Revisa los logs del SQL Editor
2. Ejecuta el script de verificación
3. Compara los datos manualmente entre `public` y `ecommerce`
4. Verifica que todas las relaciones estén correctas

