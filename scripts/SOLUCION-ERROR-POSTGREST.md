# Solución al Error: "Could not find the table 'public.ecommerce.store_items_legacy'"

## Problema
PostgREST está buscando `public.ecommerce.store_items_legacy` en lugar de `ecommerce.store_items_legacy`.

## Soluciones

### Solución 1: Verificar que las Vistas Legacy Existan (RECOMENDADA)

1. **Ejecuta el script de creación de vistas**:
   ```sql
   -- Ejecuta scripts/create-legacy-views.sql
   ```

2. **Verifica que las vistas se crearon correctamente**:
   ```sql
   -- Ejecuta scripts/verify-legacy-views.sql
   ```

3. **Verifica que el schema esté expuesto**:
   - Ve a Supabase Dashboard → Settings → API → Data API Settings
   - Asegúrate de que `ECOMMERCE` esté en "Exposed schemas"
   - Asegúrate de que `ECOMMERCE` esté en "Extra search path"

### Solución 2: Verificar Configuración de PostgREST

Si las vistas existen pero aún hay errores, puede ser un problema de cache de PostgREST:

1. **Recarga el schema en PostgREST**:
   - Ve a Supabase Dashboard → Settings → API
   - Haz clic en "Reload schema" o espera unos minutos para que se actualice automáticamente

2. **Verifica que el schema tenga permisos correctos**:
   ```sql
   -- Verificar permisos
   SELECT 
     grantee,
     table_schema,
     table_name,
     privilege_type
   FROM information_schema.role_table_grants
   WHERE table_schema = 'ecommerce'
     AND table_name LIKE '%_legacy';
   ```

### Solución 3: Ajustar el Search Path (Si es necesario)

Si PostgREST aún no puede acceder, puedes agregar el schema al search_path de PostgREST:

```sql
-- Esto debería configurarse automáticamente cuando expones el schema,
-- pero puedes verificarlo ejecutando:
ALTER DATABASE postgres SET search_path TO public, ecommerce;
```

**Nota**: Esto debe hacerse con cuidado y puede requerir permisos de superusuario.

### Solución 4: Verificar RLS (Row Level Security)

Si las vistas existen pero aún no puedes acceder, verifica las políticas RLS:

```sql
-- Verificar si RLS está habilitado en las tablas base
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'ecommerce'
  AND tablename IN ('stores', 'store_items', 'orders', 'item_categories');

-- Si RLS está habilitado, necesitas crear políticas apropiadas
-- o deshabilitarlo temporalmente para las vistas legacy
```

### Solución 5: Recrear las Vistas (Último recurso)

Si nada funciona, puedes intentar recrear las vistas:

```sql
-- Primero eliminar las vistas
DROP VIEW IF EXISTS ecommerce.stores_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.store_items_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.orders_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.item_options_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.component_styles_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.app_themes_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.app_fonts_legacy CASCADE;

-- Luego ejecutar el script de creación nuevamente
-- scripts/create-legacy-views.sql
```

## Verificación Final

Después de aplicar cualquier solución, verifica que todo funcione:

1. **Ejecuta el diagnóstico**:
   ```sql
   -- Ejecuta scripts/diagnose-postgrest-access.sql
   ```

2. **Prueba una consulta simple desde el cliente**:
   ```typescript
   const { data, error } = await supabase
     .from('ecommerce.stores_legacy')
     .select('*')
     .limit(1)
   
   if (error) {
     console.error('Error:', error)
   } else {
     console.log('✅ Acceso exitoso:', data)
   }
   ```

3. **Verifica los logs de la aplicación** para ver si los errores desaparecen

## Notas Importantes

- Las vistas legacy son de **solo lectura** - no se pueden hacer INSERT/UPDATE/DELETE en ellas
- Las operaciones de escritura deben hacerse en las tablas reales del schema `ecommerce`
- PostgREST puede tardar unos minutos en actualizar el schema cache después de crear nuevas vistas
- Si cambias el search_path, puede afectar otras consultas - úsalo con precaución

