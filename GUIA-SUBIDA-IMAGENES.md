# Guía de Configuración: Subida de Imágenes a Supabase Storage

Esta guía explica cómo configurar el sistema de subida de imágenes para que los administradores puedan subir imágenes y almacenarlas en Supabase Storage.

## 📋 Requisitos Previos

- Tener acceso al Dashboard de Supabase
- Tener permisos de administrador en el proyecto
- Variables de entorno configuradas (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## 🚀 Pasos de Configuración

### Paso 1: Crear el Bucket en Supabase Storage

1. Ve al **Supabase Dashboard** → **Storage**
2. Haz clic en **"New bucket"** o **"Crear bucket"**
3. Configura el bucket:
   - **Nombre**: `component-images`
   - **Público**: ✅ **Sí** (marcar como público para que las imágenes sean accesibles)
   - **File size limit**: 5 MB (o el tamaño que prefieras)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp,image/gif`
4. Haz clic en **"Create bucket"**

### Paso 2: Configurar Políticas RLS (Row Level Security)

1. Ve al **Supabase Dashboard** → **SQL Editor**
2. Ejecuta el script `scripts/27-setup-storage-bucket.sql`

Este script crea las siguientes políticas:
- **Public Access**: Permite que todos puedan ver las imágenes (lectura pública)
- **Admin Upload**: Solo administradores pueden subir imágenes
- **Admin Update**: Solo administradores pueden actualizar imágenes
- **Admin Delete**: Solo administradores pueden eliminar imágenes

### Paso 3: Verificar la Configuración

1. Verifica que el bucket `component-images` existe y está marcado como público
2. Verifica que las políticas RLS están activas en **Storage** → **Policies**
3. Prueba subir una imagen desde el panel de administración

## 📝 Uso del Sistema

### Para Administradores

1. **Activar modo edición**: Haz clic en el botón "Modo Edición" (botón azul flotante)
2. **Seleccionar componente**: Haz clic en cualquier sección que tenga imágenes (Hero, Featured, Popular, Products)
3. **Editar imágenes**: 
   - En el panel de edición, ve a la pestaña "Contenido"
   - Para campos de imagen, verás un componente especial con:
     - Preview de la imagen actual
     - Input para URL manual
     - Botón "Subir Imagen" para subir archivos
4. **Subir nueva imagen**:
   - Haz clic en "Subir Imagen"
   - Selecciona un archivo de imagen (JPG, PNG, WEBP, GIF)
   - La imagen se subirá automáticamente a Supabase Storage
   - La URL se guardará automáticamente en el campo
5. **Guardar cambios**: Haz clic en "Guardar Cambios" al final del panel

### Formatos Soportados

- JPEG / JPG
- PNG
- WEBP
- GIF

### Límites

- **Tamaño máximo**: 5 MB por imagen
- **Solo administradores**: Solo usuarios con rol 'admin' pueden subir imágenes

## 🔧 Solución de Problemas

### Error: "Bucket no encontrado"
- **Solución**: Asegúrate de que el bucket `component-images` existe y está creado en Supabase Storage

### Error: "Acceso denegado"
- **Solución**: Verifica que:
  1. El usuario tiene rol 'admin' en la tabla `user_profiles`
  2. Las políticas RLS están configuradas correctamente
  3. El bucket está marcado como público

### Error: "Tipo de archivo no permitido"
- **Solución**: Asegúrate de que el archivo es una imagen en uno de los formatos soportados

### Error: "El archivo es demasiado grande"
- **Solución**: Reduce el tamaño de la imagen o aumenta el límite en el código (actualmente 5MB)

### Las imágenes no se muestran
- **Solución**: Verifica que:
  1. El bucket está marcado como público
  2. La URL de la imagen es correcta
  3. Las políticas de lectura pública están activas

## 📁 Estructura de Archivos

```
lib/supabase/
  └── storage-api.ts          # API para subir/eliminar imágenes

components/admin/
  └── image-upload.tsx        # Componente de upload con preview

scripts/
  └── 27-setup-storage-bucket.sql  # Script SQL para configurar bucket y políticas
```

## 🔐 Seguridad

- Solo usuarios con rol 'admin' pueden subir/eliminar imágenes
- Las imágenes subidas son públicas (accesibles por URL)
- Se valida el tipo y tamaño de archivo antes de subir
- Los nombres de archivo son únicos (timestamp + random string)

## 📚 Referencias

- [Documentación de Supabase Storage](https://supabase.com/docs/guides/storage)
- [Políticas RLS de Storage](https://supabase.com/docs/guides/storage/security/access-control)



