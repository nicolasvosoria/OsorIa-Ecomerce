# 🎨 Guía: Favicons por Subdominio

Esta guía explica cómo configurar favicons diferentes para cada subdominio/tienda en tu plataforma multi-tenant.

## 📋 Funcionalidad

El componente `DynamicFavicon` permite que cada subdominio tenga su propio favicon personalizado. El sistema detecta automáticamente el subdominio activo y carga el favicon correspondiente.

## 🚀 Cómo Funciona

1. **Detección automática**: El componente detecta el subdominio de la tienda activa usando el contexto `StoreProvider`
2. **Búsqueda de favicon**: Busca un favicon específico con el formato `/favicon-{subdomain}.ico`
3. **Fallback**: Si no existe un favicon específico, usa el favicon por defecto (`/favicon.ico`)
4. **Actualización dinámica**: El favicon se actualiza automáticamente cuando cambias de tienda

## 📁 Estructura de Archivos

Coloca tus favicons en la carpeta `/public` con el siguiente formato:

```
/public
  ├── favicon.ico                    # Favicon por defecto (requerido)
  ├── favicon-reposteria.ico         # Favicon para subdominio "reposteria"
  ├── favicon-{subdomain}.ico        # Favicon para cualquier otro subdominio
  ├── apple-touch-icon.png           # Icono para Apple (opcional)
  └── apple-touch-icon-reposteria.png # Icono Apple para "reposteria" (opcional)
```

## 🛠️ Pasos para Configurar

### Paso 1: Crear Favicons

Crea favicons para cada subdominio que quieras personalizar:

1. **Para la tienda de repostería**:
   - Crea un archivo llamado `favicon-reposteria.ico`
   - Colócalo en `/public/favicon-reposteria.ico`

2. **Para otras tiendas**:
   - Crea favicons con el formato `favicon-{subdomain}.ico`
   - Ejemplo: `favicon-electronica.ico` para el subdominio "electronica"

### Paso 2: Formato de Favicon

Los favicons deben ser archivos `.ico` con las siguientes características recomendadas:
- **Tamaño**: 16x16, 32x32, o 48x48 píxeles
- **Formato**: `.ico` (formato estándar)
- **Alternativa**: También puedes usar `.png` si cambias la extensión en el código

### Paso 3: Verificar Funcionamiento

1. Inicia el servidor de desarrollo: `pnpm dev`
2. Accede a diferentes subdominios:
   - `http://localhost:3000` → Usa `/favicon.ico` (por defecto)
   - `http://reposteria.localhost:3000` → Usa `/favicon-reposteria.ico` (si existe)
3. Verifica en la consola del navegador los logs:
   ```
   [Favicon] Actualizado a: /favicon-reposteria.ico
   ```

## 🔧 Personalización Avanzada

### Usar PNG en lugar de ICO

Si prefieres usar archivos PNG, puedes modificar el componente `DynamicFavicon`:

```typescript
// Cambiar la extensión de .ico a .png
const faviconPath = subdomain === 'default' 
  ? '/favicon.png' 
  : `/favicon-${subdomain}.png`
```

### Agregar Apple Touch Icons

El componente también actualiza automáticamente los Apple Touch Icons si existen:

1. Crea archivos con formato: `/apple-touch-icon-{subdomain}.png`
2. Tamaño recomendado: 180x180 píxeles
3. El componente los detectará y actualizará automáticamente

### Favicons desde Supabase Storage

Si quieres almacenar favicons en Supabase Storage en lugar de archivos estáticos:

1. Sube los favicons a Supabase Storage
2. Obtén las URLs públicas
3. Modifica el componente para usar URLs de Supabase:

```typescript
// Ejemplo de modificación
const faviconPath = subdomain === 'default' 
  ? '/favicon.ico' 
  : `https://tu-proyecto.supabase.co/storage/v1/object/public/favicons/favicon-${subdomain}.ico`
```

## 📝 Ejemplo de Uso

### Caso 1: Tienda por Defecto
- **Subdominio**: `default` o sin subdominio
- **Favicon usado**: `/favicon.ico`
- **Archivo requerido**: `/public/favicon.ico`

### Caso 2: Tienda de Repostería
- **Subdominio**: `reposteria`
- **Favicon usado**: `/favicon-reposteria.ico`
- **Archivo requerido**: `/public/favicon-reposteria.ico`
- **Si no existe**: Usa `/favicon.ico` como fallback

### Caso 3: Nueva Tienda
- **Subdominio**: `electronica`
- **Favicon usado**: `/favicon-electronica.ico`
- **Archivo requerido**: `/public/favicon-electronica.ico`
- **Si no existe**: Usa `/favicon.ico` como fallback

## 🐛 Troubleshooting

### El favicon no cambia

1. **Verifica que el archivo existe**:
   - Asegúrate de que el favicon esté en `/public/favicon-{subdomain}.ico`
   - Verifica que el nombre del archivo coincida exactamente con el subdominio

2. **Limpia la caché del navegador**:
   - Los navegadores cachean favicons agresivamente
   - Usa Ctrl+Shift+R (o Cmd+Shift+R en Mac) para recargar sin caché

3. **Verifica la consola del navegador**:
   - Busca mensajes como `[Favicon] Actualizado a: ...`
   - Si ves errores, verifica que el archivo sea accesible

### El favicon específico no se carga

- **Verifica el formato**: Asegúrate de que sea un archivo `.ico` válido
- **Verifica el tamaño**: Archivos muy grandes pueden causar problemas
- **Verifica permisos**: Asegúrate de que el archivo sea accesible públicamente

### El favicon se muestra incorrectamente

- **Formato incorrecto**: Asegúrate de usar `.ico` o `.png` válidos
- **Tamaño incorrecto**: Usa tamaños estándar (16x16, 32x32, 48x48)
- **Caché del navegador**: Limpia la caché y recarga

## ✅ Checklist

- [ ] Favicon por defecto (`/favicon.ico`) existe en `/public`
- [ ] Favicons específicos creados con formato `favicon-{subdomain}.ico`
- [ ] Favicons colocados en la carpeta `/public`
- [ ] Componente `DynamicFavicon` integrado en `app/layout.tsx`
- [ ] Probado en diferentes subdominios
- [ ] Verificado en la consola del navegador que los favicons se cargan correctamente

## 📚 Recursos Adicionales

- [Generador de Favicons](https://realfavicongenerator.net/) - Herramienta para crear favicons en múltiples formatos
- [Documentación de Next.js sobre Favicons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons)
- [Formato ICO](https://en.wikipedia.org/wiki/ICO_(file_format)) - Información sobre el formato ICO

## 🎯 Notas Importantes

1. **Caché del navegador**: Los navegadores cachean favicons agresivamente. Puede tomar unos minutos ver los cambios.

2. **Formato recomendado**: Aunque el componente soporta diferentes formatos, `.ico` es el estándar más compatible.

3. **Tamaño de archivo**: Mantén los favicons pequeños (< 100KB) para mejor rendimiento.

4. **Fallback automático**: Si un favicon específico no existe, el sistema usa automáticamente el favicon por defecto.






