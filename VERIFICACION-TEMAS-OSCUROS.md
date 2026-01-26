# 🌙 Verificación de Temas Oscuros

Esta guía te ayudará a verificar que los temas oscuros están aplicando correctamente los colores, especialmente los fondos.

## 📋 Temas Oscuros Disponibles

El sistema incluye 2 temas oscuros:

1. **Oscuro Azul**
   - Background: `#0f172a` (azul muy oscuro)
   - Foreground: `#f1f5f9` (texto claro)
   - Card: `#1e293b` (tarjetas oscuras)
   - Primary: `#3b82f6` (azul brillante)
   - Border: `#334155` (bordes oscuros)

2. **Oscuro Verde**
   - Background: `#0f172a` (azul muy oscuro)
   - Foreground: `#f1f5f9` (texto claro)
   - Card: `#1e293b` (tarjetas oscuras)
   - Primary: `#10b981` (verde brillante)
   - Border: `#334155` (bordes oscuros)

## ✅ Pasos de Verificación

### 1. Verificar en Supabase

Ejecuta el script de verificación en el SQL Editor de Supabase:

```sql
-- Ejecuta: scripts/verificar-temas-oscuros.sql
```

Este script verificará:
- ✅ Que los temas oscuros existen
- ✅ Que tienen los colores de fondo correctos (`#0f172a`)
- ✅ Que todos los campos de color están presentes
- ✅ Comparación entre temas claros y oscuros

### 2. Verificar en el Navegador

1. **Activa un tema oscuro:**
   - Ve a `/admin` (si eres admin)
   - Abre el selector de temas
   - Selecciona "Oscuro Azul" o "Oscuro Verde"

2. **Verifica el fondo del body:**
   - Abre DevTools → Elements
   - Selecciona `<body>`
   - Verifica que `background-color` sea `#0f172a` (o el color del tema oscuro)
   - **IMPORTANTE:** El fondo debe cambiar inmediatamente

3. **Verifica las variables CSS:**
   - Selecciona `<html>` o `:root`
   - Verifica que las variables estén aplicadas:
     ```css
     --background: #0f172a
     --foreground: #f1f5f9
     --card: #1e293b
     --primary: #3b82f6 (o #10b981 para verde)
     ```

4. **Verifica que el contenido sea visible:**
   - El texto debe ser claro (`#f1f5f9`) sobre fondo oscuro
   - Las tarjetas deben tener fondo oscuro (`#1e293b`)
   - Los bordes deben ser visibles (`#334155`)

### 3. Verificar Aplicación Inmediata

1. **Cambia de tema claro a oscuro:**
   - El fondo debe cambiar de blanco a oscuro inmediatamente
   - No debe haber "flash" de fondo blanco

2. **Recarga la página:**
   - El tema oscuro debe persistir
   - El fondo debe ser oscuro desde el inicio (sin flash)

3. **Verifica localStorage:**
   - DevTools → Application → Local Storage
   - Busca `osoria_active_theme`
   - Debe contener el tema oscuro con `background: "#0f172a"`

## 🔧 Cambios Realizados

### 1. `SiteBackground` Component

**Problema anterior:**
- Aplicaba un color de fondo fijo `#ffffff` que sobrescribía los temas oscuros

**Solución:**
- Ahora usa el color de fondo del tema activo si no hay configuración personalizada
- Respeta los temas oscuros automáticamente

### 2. `ThemeContext` - `applyTheme`

**Mejora:**
- Ahora aplica el color de fondo directamente al `body` cuando cambia el tema
- Esto asegura que los temas oscuros cambien el fondo inmediatamente

### 3. `ApplyStylesScript`

**Mejora:**
- Aplica el color de fondo del tema al `body` antes de que React se monte
- Evita el "flash" de fondo blanco en temas oscuros

## 🔍 Solución de Problemas

### Problema: El fondo sigue siendo blanco con tema oscuro

**Síntomas:**
- El tema oscuro está activo pero el fondo es blanco
- Las variables CSS tienen valores oscuros pero el body no

**Solución:**
1. Verifica que `SiteBackground` esté en `app/layout.tsx`
2. Limpia localStorage:
   ```javascript
   localStorage.removeItem('osoria_active_theme')
   ```
3. Recarga la página
4. Verifica en DevTools que el `body` tenga `background-color: #0f172a`

### Problema: El fondo cambia pero hay un flash blanco

**Síntomas:**
- Al cambiar a tema oscuro, aparece un flash de fondo blanco
- El fondo oscuro aparece después de un momento

**Solución:**
1. Verifica que `ApplyStylesScript` esté en `app/layout.tsx`
2. Verifica que el script se ejecute antes de que React se monte
3. Limpia el caché del navegador
4. Verifica que el tema esté guardado en localStorage

### Problema: Los colores del tema oscuro no coinciden

**Síntomas:**
- El fondo es oscuro pero no es `#0f172a`
- Los colores no coinciden con los esperados

**Solución:**
1. Verifica en Supabase que los temas oscuros tengan los colores correctos:
   ```sql
   SELECT theme_name, colors->>'background' as background
   FROM app_themes
   WHERE theme_name LIKE '%Oscuro%';
   ```
2. Si los colores son incorrectos, actualízalos:
   ```sql
   UPDATE app_themes
   SET colors = jsonb_set(colors, '{background}', '"#0f172a"')
   WHERE theme_name = 'Oscuro Azul';
   ```

### Problema: El fondo personalizado sobrescribe el tema oscuro

**Síntomas:**
- Hay un fondo personalizado configurado desde el admin
- Este fondo sobrescribe el tema oscuro

**Solución:**
1. Esto es comportamiento esperado si hay configuración personalizada
2. Para usar el tema oscuro, elimina o desactiva el fondo personalizado:
   - Ve a `/admin`
   - Edita el componente `site_background`
   - Elimina o desactiva la configuración de fondo

## 📝 Comandos SQL Útiles

### Activar tema oscuro
```sql
-- Desactivar todos los temas
UPDATE app_themes SET is_active = FALSE;

-- Activar Oscuro Azul
UPDATE app_themes SET is_active = TRUE WHERE theme_name = 'Oscuro Azul';

-- O activar Oscuro Verde
UPDATE app_themes SET is_active = TRUE WHERE theme_name = 'Oscuro Verde';
```

### Verificar colores de temas oscuros
```sql
SELECT 
  theme_name,
  colors->>'background' as background,
  colors->>'foreground' as foreground,
  colors->>'card' as card,
  colors->>'primary' as primary
FROM app_themes
WHERE theme_name LIKE '%Oscuro%';
```

### Corregir colores si están incorrectos
```sql
-- Corregir Oscuro Azul
UPDATE app_themes
SET colors = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(colors, '{background}', '"#0f172a"'),
      '{foreground}', '"#f1f5f9"'
    ),
    '{card}', '"#1e293b"'
  ),
  '{primary}', '"#3b82f6"'
)
WHERE theme_name = 'Oscuro Azul';

-- Corregir Oscuro Verde
UPDATE app_themes
SET colors = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(colors, '{background}', '"#0f172a"'),
      '{foreground}', '"#f1f5f9"'
    ),
    '{card}', '"#1e293b"'
  ),
  '{primary}', '"#10b981"'
)
WHERE theme_name = 'Oscuro Verde';
```

## ✅ Checklist de Verificación

- [ ] Los temas oscuros existen en Supabase
- [ ] Los temas oscuros tienen `background: "#0f172a"`
- [ ] Al activar un tema oscuro, el fondo del body cambia a oscuro
- [ ] No hay "flash" de fondo blanco al cambiar a tema oscuro
- [ ] El texto es claro y legible sobre fondo oscuro
- [ ] Las tarjetas tienen fondo oscuro (`#1e293b`)
- [ ] Los bordes son visibles (`#334155`)
- [ ] El tema oscuro persiste al recargar la página
- [ ] localStorage contiene el tema oscuro correcto

## 🎯 Resultado Esperado

Cuando todo funciona correctamente:

1. **Al activar tema oscuro:**
   - El fondo del body cambia inmediatamente a `#0f172a`
   - El texto cambia a `#f1f5f9` (claro)
   - Las tarjetas tienen fondo `#1e293b`
   - No hay flash de fondo blanco

2. **Al recargar la página:**
   - El fondo oscuro se aplica antes de que React se monte
   - No hay flash de contenido sin estilo
   - El tema oscuro persiste

3. **En DevTools:**
   - `<body>` tiene `background-color: rgb(15, 23, 42)` (equivalente a `#0f172a`)
   - `:root` tiene `--background: #0f172a`
   - Todas las variables CSS tienen valores oscuros

---

Si después de seguir esta guía aún tienes problemas, verifica:
1. Que los temas oscuros existan en Supabase con los colores correctos
2. Que no haya configuración de fondo personalizada que sobrescriba el tema
3. Que `SiteBackground` y `ApplyStylesScript` estén en `app/layout.tsx`
