# 🔧 Solución al Error de Temas (Themes)

## ❌ Error Actual

```
[Theme] ❌ Error fetching themes: {}
```

Este error ocurre porque:
1. La tabla `app_themes` puede no tener la columna `store_id`
2. RLS (Row Level Security) puede estar bloqueando las consultas
3. La tabla puede no tener datos

## ✅ Solución Paso a Paso

### Paso 1: Ejecutar Script SQL en Supabase

Ve al **SQL Editor** de Supabase y ejecuta este script completo:

```sql
-- ============================================
-- SCRIPT COMPLETO PARA ARREGLAR app_themes
-- ============================================

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE IF EXISTS app_themes DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas RLS existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename = 'app_themes') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 3. Verificar que la tabla existe, si no, crearla
CREATE TABLE IF NOT EXISTS app_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name VARCHAR(100) NOT NULL UNIQUE,
  colors JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Agregar columna store_id si no existe
ALTER TABLE IF EXISTS app_themes 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- 5. Crear índice para store_id
CREATE INDEX IF NOT EXISTS idx_app_themes_store_id ON app_themes(store_id);

-- 6. Insertar temas por defecto si la tabla está vacía
INSERT INTO app_themes (theme_name, colors, is_active, store_id)
SELECT * FROM (VALUES
  ('Claro Original', '{"primary":"#005aa1","secondary":"#c4faff","accent":"#005aa1","background":"#ffffff","foreground":"#1a1a1a","card":"#ffffff","cardForeground":"#1a1a1a","border":"#e5e5e5","muted":"#f5f5f5","mutedForeground":"#737373"}'::jsonb, TRUE, NULL),
  ('Claro Azul', '{"primary":"#2563eb","secondary":"#dbeafe","accent":"#2563eb","background":"#ffffff","foreground":"#1e293b","card":"#ffffff","cardForeground":"#1e293b","border":"#e2e8f0","muted":"#f1f5f9","mutedForeground":"#64748b"}'::jsonb, FALSE, NULL),
  ('Oscuro Azul', '{"primary":"#3b82f6","secondary":"#1e3a8a","accent":"#60a5fa","background":"#0f172a","foreground":"#f1f5f9","card":"#1e293b","cardForeground":"#f1f5f9","border":"#334155","muted":"#1e293b","mutedForeground":"#94a3b8"}'::jsonb, FALSE, NULL),
  ('Oscuro Verde', '{"primary":"#10b981","secondary":"#064e3b","accent":"#34d399","background":"#0f172a","foreground":"#f1f5f9","card":"#1e293b","cardForeground":"#f1f5f9","border":"#334155","muted":"#1e293b","mutedForeground":"#94a3b8"}'::jsonb, FALSE, NULL)
) AS v(theme_name, colors, is_active, store_id)
WHERE NOT EXISTS (SELECT 1 FROM app_themes WHERE theme_name = v.theme_name)
ON CONFLICT (theme_name) DO NOTHING;

-- 7. Si hay una tienda por defecto, asignar temas sin store_id a ella
DO $$
DECLARE
    default_store_id UUID;
BEGIN
    SELECT id INTO default_store_id
    FROM public.stores
    WHERE subdomain = 'default'
    LIMIT 1;
    
    IF default_store_id IS NOT NULL THEN
        UPDATE app_themes
        SET store_id = default_store_id
        WHERE store_id IS NULL;
    END IF;
END $$;

-- 8. Verificar que todo está correcto
SELECT 
    'Verificación' as paso,
    COUNT(*) as total_temas,
    COUNT(store_id) as temas_con_store_id,
    COUNT(*) FILTER (WHERE store_id IS NULL) as temas_sin_store_id
FROM app_themes;
```

### Paso 2: Verificar que Funciona

Después de ejecutar el script, verifica:

1. **Verifica que los temas existen**:
   ```sql
   SELECT * FROM app_themes;
   ```

2. **Verifica que RLS está deshabilitado**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'app_themes' AND schemaname = 'public';
   ```
   Debería mostrar `rowsecurity = false`

3. **Recarga la aplicación** en el navegador

### Paso 3: Si Aún Hay Errores

Si después de ejecutar el script aún hay errores:

1. **Verifica las credenciales de Supabase** en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Verifica que la tabla existe**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name = 'app_themes';
   ```

3. **Verifica que hay datos**:
   ```sql
   SELECT COUNT(*) FROM app_themes;
   ```

## 🔍 Troubleshooting Adicional

### Error: "relation app_themes does not exist"

**Solución**: Ejecuta primero el script `01-create-themes-table.sql` y luego el script de arriba.

### Error: "permission denied for table app_themes"

**Solución**: El script de arriba deshabilita RLS. Si aún tienes problemas, verifica que estás usando la `anon key` correcta.

### Error: "column store_id does not exist"

**Solución**: El script de arriba agrega la columna automáticamente. Si persiste, ejecuta manualmente:
```sql
ALTER TABLE app_themes ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
```

## ✅ Verificación Final

Después de ejecutar el script, deberías ver en la consola del navegador:

```
[Theme] ✅ Cliente Supabase obtenido
[Theme] Ejecutando consulta a app_themes...
[Theme] ✅ Temas cargados exitosamente: 4
```

En lugar del error anterior.

## 📝 Nota

El código TypeScript ya fue actualizado para manejar mejor los errores. Si ejecutas el script SQL de arriba, el error debería desaparecer completamente.
