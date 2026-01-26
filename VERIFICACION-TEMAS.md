# 🔍 Verificación de Temas Predeterminados

Esta guía te ayudará a verificar que los temas predeterminados de la página estén funcionando correctamente.

## 📋 Temas Predeterminados

El sistema incluye 4 temas predeterminados:

1. **Claro Original** (activo por defecto)
   - Primary: `#005aa1`
   - Secondary: `#c4faff`
   - Background: `#ffffff`
   - Foreground: `#1a1a1a`

2. **Claro Azul** (inactivo)
   - Primary: `#2563eb`
   - Secondary: `#dbeafe`
   - Background: `#ffffff`

3. **Oscuro Azul** (inactivo)
   - Primary: `#3b82f6`
   - Background: `#0f172a`
   - Foreground: `#f1f5f9`

4. **Oscuro Verde** (inactivo)
   - Primary: `#10b981`
   - Background: `#0f172a`
   - Foreground: `#1a1a1a`

## ✅ Pasos de Verificación

### 1. Verificar en Supabase

Ejecuta el script de verificación en el SQL Editor de Supabase:

```sql
-- Ejecuta: scripts/verificar-temas-predeterminados.sql
```

Este script verificará:
- ✅ Que la tabla `app_themes` existe
- ✅ Que RLS está deshabilitado
- ✅ Que existen los 4 temas predeterminados
- ✅ Que "Claro Original" está activo
- ✅ Que la estructura de colores es correcta

### 2. Verificar en el Navegador

1. **Abre la consola del navegador** (F12 → Console)

2. **Busca los logs de temas:**
   ```
   [Theme] Iniciando carga de temas...
   [Theme] Temas recibidos: 4
   [Theme] Tema activo: Sí
   [Theme] Usando tema activo desde BD: Claro Original
   ```

3. **Verifica las variables CSS:**
   - Abre DevTools → Elements
   - Selecciona `<html>` o `:root`
   - Verifica que las variables CSS estén aplicadas:
     ```css
     --primary: #005aa1
     --secondary: #c4faff
     --background: #ffffff
     --foreground: #1a1a1a
     ```

### 3. Verificar Aplicación del Tema

1. **Recarga la página** y verifica que:
   - No hay "flash" de contenido sin estilo
   - Los colores se aplican inmediatamente
   - El tema "Claro Original" está activo

2. **Verifica localStorage:**
   - Abre DevTools → Application → Local Storage
   - Busca la clave `osoria_active_theme`
   - Debe contener el tema "Claro Original" con sus colores

### 4. Verificar Cambio de Tema (Admin)

Si eres administrador:

1. Ve a `/admin`
2. Abre el selector de temas
3. Cambia a otro tema (ej: "Oscuro Azul")
4. Verifica que:
   - Los colores cambian inmediatamente
   - El tema se guarda en la base de datos
   - El tema persiste al recargar la página

## 🔧 Solución de Problemas

### Problema: No se cargan temas

**Síntomas:**
- Console muestra: `[Theme] ⚠️ No se encontraron temas en la base de datos`
- La página no tiene colores aplicados

**Solución:**
1. Ejecuta `scripts/01-create-themes-table.sql` en Supabase
2. Verifica que los temas se insertaron:
   ```sql
   SELECT * FROM app_themes;
   ```
3. Recarga la página

### Problema: Error de RLS

**Síntomas:**
- Console muestra: `Error fetching themes: permission denied`
- Error code: `PGRST301`

**Solución:**
1. Ejecuta `scripts/18-fix-rls-y-datos-final.sql` en Supabase
2. Verifica que RLS está deshabilitado:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'app_themes';
   ```
   Debe mostrar `rowsecurity = false`

### Problema: Tema no se aplica

**Síntomas:**
- Los temas se cargan pero no se aplican
- Las variables CSS no cambian

**Solución:**
1. Verifica que `ApplyStylesScript` está en `app/layout.tsx`
2. Limpia localStorage:
   ```javascript
   localStorage.removeItem('osoria_active_theme')
   ```
3. Recarga la página

### Problema: Tema activo incorrecto

**Síntomas:**
- Se muestra un tema diferente a "Claro Original"
- Múltiples temas están activos

**Solución:**
1. Verifica en Supabase:
   ```sql
   SELECT theme_name, is_active FROM app_themes;
   ```
2. Solo debe haber UN tema con `is_active = TRUE`
3. Si hay múltiples, desactiva todos y activa solo "Claro Original":
   ```sql
   UPDATE app_themes SET is_active = FALSE;
   UPDATE app_themes SET is_active = TRUE WHERE theme_name = 'Claro Original';
   ```

### Problema: Temas filtrados por store_id

**Síntomas:**
- No se encuentran temas aunque existen en la BD
- Console muestra: `No se encontraron temas para store_id: [uuid]`

**Solución:**
1. Verifica si los temas tienen `store_id`:
   ```sql
   SELECT theme_name, store_id FROM app_themes;
   ```
2. Si los temas tienen `store_id` pero no coinciden con tu tienda:
   - Opción A: Asignar temas a tu tienda:
     ```sql
     UPDATE app_themes 
     SET store_id = 'tu-store-id' 
     WHERE store_id IS NULL;
     ```
   - Opción B: Crear temas sin `store_id` (globales):
     ```sql
     UPDATE app_themes SET store_id = NULL;
     ```

## 📝 Comandos SQL Útiles

### Ver todos los temas
```sql
SELECT theme_name, is_active, store_id, created_at 
FROM app_themes 
ORDER BY is_active DESC, theme_name;
```

### Activar "Claro Original"
```sql
UPDATE app_themes SET is_active = FALSE;
UPDATE app_themes SET is_active = TRUE WHERE theme_name = 'Claro Original';
```

### Verificar estructura de colores
```sql
SELECT 
  theme_name,
  jsonb_object_keys(colors) as campo_color
FROM app_themes
WHERE theme_name = 'Claro Original';
```

### Reinsertar temas predeterminados
```sql
-- Primero eliminar temas existentes (CUIDADO: esto eliminará todos los temas)
DELETE FROM app_themes;

-- Luego ejecutar scripts/01-create-themes-table.sql
-- O ejecutar scripts/18-fix-rls-y-datos-final.sql (que incluye la inserción)
```

## ✅ Checklist de Verificación

- [ ] Tabla `app_themes` existe en Supabase
- [ ] RLS está deshabilitado en `app_themes`
- [ ] Existen los 4 temas predeterminados
- [ ] "Claro Original" está activo (`is_active = TRUE`)
- [ ] Solo hay UN tema activo
- [ ] Los temas se cargan en la consola del navegador
- [ ] Las variables CSS se aplican correctamente
- [ ] El tema persiste al recargar la página
- [ ] No hay "flash" de contenido sin estilo
- [ ] El cambio de tema funciona (si eres admin)

## 🎯 Resultado Esperado

Cuando todo funciona correctamente:

1. **En Supabase:**
   - 4 temas en la tabla `app_themes`
   - Solo "Claro Original" con `is_active = TRUE`
   - RLS deshabilitado

2. **En el Navegador:**
   - Console muestra: `[Theme] ✅ Temas cargados exitosamente: 4`
   - Variables CSS aplicadas: `--primary: #005aa1`
   - localStorage contiene: `osoria_active_theme` con "Claro Original"
   - Página se ve con los colores del tema activo

---

Si después de seguir esta guía aún tienes problemas, verifica:
1. Que las variables de entorno de Supabase estén correctas
2. Que la conexión a Supabase funcione
3. Que no haya errores en la consola del navegador
