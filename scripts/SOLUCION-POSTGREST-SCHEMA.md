# Solución al Error: "Could not find the table 'public.ecommerce.store_items_legacy'"

## 🔍 Diagnóstico

El error indica que PostgREST está buscando `public.ecommerce.store_items_legacy` en lugar de `ecommerce.store_items_legacy`. Esto significa que PostgREST está interpretando `ecommerce` como parte del nombre de la tabla en el schema `public`, en lugar de como un schema separado.

## ✅ Soluciones (en orden de prioridad)

### Solución 1: Verificar Configuración de Data API (MÁS IMPORTANTE)

1. Ve a **Supabase Dashboard** → **Settings** → **API** → **Data API Settings**

2. Verifica que:
   - ✅ **"Enable Data API"** esté activado
   - ✅ **"ECOMMERCE"** esté en **"Exposed schemas"** (lista de la izquierda)
   - ✅ **"ECOMMERCE"** esté en **"Extra search path"** (lista de la derecha)

3. Si `ECOMMERCE` no está en ninguna de las listas:
   - Haz clic en el campo "Exposed schemas"
   - Busca y selecciona `ECOMMERCE`
   - Haz clic en el campo "Extra search path"
   - Busca y selecciona `ECOMMERCE`
   - **Guarda los cambios**

### Solución 2: Ejecutar Script de Permisos

Ejecuta el script para asegurar que todos los permisos estén correctos:

```sql
-- Ejecuta: scripts/fix-postgrest-schema-access.sql
```

Este script otorga todos los permisos necesarios en el schema `ecommerce` y sus tablas/vistas.

### Solución 3: Esperar Actualización del Cache

PostgREST actualiza su cache automáticamente cada 2-3 minutos. Después de:

1. Exponer el schema `ecommerce`
2. Crear las vistas legacy
3. Otorgar permisos

**Espera 2-3 minutos** y luego prueba nuevamente.

### Solución 4: Forzar Actualización del Schema (Si es necesario)

Si después de esperar el problema persiste, puedes intentar forzar una actualización:

1. **Opción A**: Hacer un pequeño cambio en una vista para forzar que PostgREST la recargue:
   ```sql
   -- Agregar un comentario a la vista
   COMMENT ON VIEW ecommerce.store_items_legacy IS 'Vista legacy para compatibilidad - actualizado ' || NOW();
   ```

2. **Opción B**: Ejecutar el script de refresh:
   ```sql
   -- Ejecuta: scripts/force-postgrest-refresh.sql
   ```

### Solución 5: Verificar Variables de Entorno

Asegúrate de que las variables de entorno estén correctas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

**Reinicia el servidor de desarrollo** después de verificar las variables.

### Solución 6: Verificar que las Vistas Existen

Ejecuta este query para verificar:

```sql
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'ecommerce' 
  AND table_name LIKE '%_legacy'
ORDER BY table_name;
```

Deberías ver todas las vistas legacy listadas.

## 🔧 Verificación Paso a Paso

1. ✅ **Vistas creadas**: Ejecuta `scripts/verify-legacy-views.sql`
2. ✅ **Schema expuesto**: Verifica en Data API Settings
3. ✅ **Permisos otorgados**: Ejecuta `scripts/fix-postgrest-schema-access.sql`
4. ✅ **Espera 2-3 minutos**: Para que PostgREST actualice el cache
5. ✅ **Prueba acceso**: Ejecuta `scripts/test-ecommerce-schema.sql`
6. ✅ **Reinicia servidor**: Si es necesario, reinicia el servidor de desarrollo

## ⚠️ Si Nada Funciona

Si después de todos estos pasos el problema persiste:

1. **Contacta con Soporte de Supabase**: Pueden forzar un refresh del schema cache
2. **Verifica logs de PostgREST**: En Supabase Dashboard → Logs → API
3. **Prueba acceso directo**: Usa el SQL Editor para verificar que las vistas son accesibles desde SQL

## 📝 Nota sobre PostgREST

PostgREST mantiene un cache del schema para mejorar el rendimiento. Cuando:
- Se crean nuevas tablas/vistas
- Se exponen nuevos schemas
- Se cambian permisos

PostgREST puede tardar unos minutos en actualizar su cache. Esto es normal y esperado.

## ✅ Checklist Final

- [ ] Schema `ecommerce` está en "Exposed schemas"
- [ ] Schema `ecommerce` está en "Extra search path" (opcional pero recomendado)
- [ ] Todas las vistas legacy están creadas
- [ ] Permisos están otorgados (scripts ejecutados)
- [ ] Esperaste 2-3 minutos después de los cambios
- [ ] Reiniciaste el servidor de desarrollo
- [ ] Las variables de entorno están correctas

