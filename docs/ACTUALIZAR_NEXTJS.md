# Guía para Actualizar Next.js

## Estado Actual

- **Next.js:** 15.2.4
- **React:** 19.x
- **React DOM:** 19.x

## Pasos para Actualizar

### Opción 1: Usar el Script Automático (Recomendado)

Ejecuta el script de PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update-nextjs.ps1
```

### Opción 2: Actualización Manual

1. **Actualizar Next.js y React:**
   ```bash
   pnpm update next@latest react@latest react-dom@latest
   ```

2. **Actualizar tipos de TypeScript:**
   ```bash
   pnpm update @types/react@latest @types/react-dom@latest @types/node@latest
   ```

3. **Actualizar eslint-config-next (si existe):**
   ```bash
   pnpm update eslint-config-next@latest
   ```

### Opción 3: Actualizar package.json Directamente

El `package.json` ya está configurado para usar `"next": "latest"`. Solo necesitas:

```bash
pnpm install
```

## Verificar la Actualización

Después de actualizar, verifica las versiones instaladas:

```bash
pnpm list next react react-dom
```

## Probar la Aplicación

1. **Limpiar caché:**
   ```bash
   rm -rf .next
   pnpm install
   ```

2. **Compilar el proyecto:**
   ```bash
   pnpm build
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   pnpm dev
   ```

## Cambios Importantes en Next.js 15

### Características Nuevas:
- Mejoras en el App Router
- Optimizaciones de rendimiento
- Mejor soporte para React 19
- Mejoras en el sistema de caché

### Posibles Cambios Breaking:

1. **Configuración Experimental:**
   - Algunas características experimentales pueden haberse estabilizado
   - Revisa `next.config.mjs` para ver si hay opciones que ya no necesitan el flag `experimental`

2. **TypeScript:**
   - Asegúrate de tener TypeScript 5.x
   - Los tipos pueden haber cambiado ligeramente

3. **React 19:**
   - El proyecto ya usa React 19, así que debería ser compatible

## Verificar Compatibilidad

### Dependencias Críticas:
- ✅ `@supabase/ssr` - Compatible con Next.js 15
- ✅ `nuqs` - Compatible con Next.js 15
- ✅ `next-themes` - Compatible con Next.js 15
- ✅ `@vercel/analytics` - Compatible con Next.js 15

### Configuración Actual:

El `next.config.mjs` tiene estas opciones experimentales:
- `inlineCss: true`
- `useCache: true`
- `clientSegmentCache: true`

Estas opciones pueden haberse estabilizado en versiones más recientes.

## Solución de Problemas

### Error: "Module not found"

**Solución:**
```bash
rm -rf node_modules .next
pnpm install
```

### Error: "Type errors"

**Solución:**
```bash
pnpm update @types/react@latest @types/react-dom@latest
```

### Error: "Build failed"

**Solución:**
1. Revisa los logs de build
2. Verifica que todas las dependencias estén actualizadas
3. Limpia el caché: `rm -rf .next`

## Después de la Actualización

1. ✅ Verifica que el proyecto compile: `pnpm build`
2. ✅ Prueba en desarrollo: `pnpm dev`
3. ✅ Revisa la consola por warnings
4. ✅ Prueba las funcionalidades principales:
   - Autenticación
   - Carrito de compras
   - Temas y tipografías
   - Chatbot
   - Recuperación de contraseña

## Notas

- El proyecto ya está en Next.js 15.2.4, que es una versión reciente
- La actualización a "latest" traerá la versión más reciente disponible
- Siempre prueba en desarrollo antes de desplegar a producción

