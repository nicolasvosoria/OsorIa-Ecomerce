# Cómo Verificar la URL Correcta de Supabase

## Problema Actual
El dominio `qwwnrjjmxpwppgipsug.supabase.co` no se puede resolver (ERR_NAME_NOT_RESOLVED).

## Solución

### Paso 1: Obtener la URL Correcta de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. En la sección **Project URL**, copia la URL completa
   - Debería verse como: `https://xxxxxxxxxxxxx.supabase.co`
   - **NO** debe tener `/rest/v1` al final

### Paso 2: Actualizar el archivo .env.local

Abre el archivo `.env.local` en la raíz del proyecto y actualiza:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_URL_CORRECTA.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3d3ducmpqbXhwd3BwZ2lwc3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTAyMzMsImV4cCI6MjA3ODQ2NjIzM30.SqHRG8IC3ZvGYcC5bXvg2w6TbnmA2xjU51bpjP1p0WQ
```

### Paso 3: Reiniciar el Servidor

Después de actualizar el archivo, reinicia el servidor de desarrollo:

```bash
# Detener el servidor (Ctrl+C)
# Luego iniciar de nuevo
pnpm dev
```

### Paso 4: Verificar la Conexión

1. Abre la consola del navegador (F12)
2. Recarga la página
3. Deberías ver:
   - `[Supabase] ✅ Cliente creado exitosamente`
   - Sin errores de `ERR_NAME_NOT_RESOLVED`

## Nota Importante

La URL de Supabase debe ser exactamente como aparece en el Dashboard, sin barras adicionales ni rutas al final.




