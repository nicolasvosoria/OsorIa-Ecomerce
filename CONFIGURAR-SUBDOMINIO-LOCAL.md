# 🏠 Configurar Subdominio en Servidor Local

Esta guía te explica cómo configurar y probar el subdominio `reposteria.localhost` en tu servidor de desarrollo local.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de haber:
- ✅ Ejecutado los scripts SQL 30-33 en Supabase
- ✅ Ejecutado el script SQL 34 (crear tienda de repostería)
- ✅ Tener el servidor de desarrollo corriendo (`pnpm dev`)

## 🚀 Paso 1: Configurar el Archivo Hosts

El archivo `hosts` permite que tu computadora resuelva `reposteria.localhost` a `127.0.0.1`.

### En Linux/Mac:

1. Abre una terminal
2. Edita el archivo hosts con permisos de administrador:

```bash
sudo nano /etc/hosts
```

3. Agrega esta línea al final del archivo:

```
127.0.0.1    reposteria.localhost
```

4. Guarda el archivo:
   - En nano: `Ctrl + O`, luego `Enter`, luego `Ctrl + X`

### En Windows:

1. Abre el Bloc de notas como **Administrador**:
   - Click derecho en Bloc de notas → "Ejecutar como administrador"

2. Abre el archivo hosts:
   - Archivo → Abrir
   - Navega a: `C:\Windows\System32\drivers\etc\`
   - Cambia el filtro a "Todos los archivos"
   - Abre el archivo `hosts`

3. Agrega esta línea al final:

```
127.0.0.1    reposteria.localhost
```

4. Guarda el archivo (Ctrl + S)

### Verificar que Funcionó:

Abre una terminal y ejecuta:

```bash
ping reposteria.localhost
```

Deberías ver que resuelve a `127.0.0.1`.

## 🚀 Paso 2: Verificar que la Tienda Existe en Supabase

Antes de probar, asegúrate de que la tienda de repostería existe:

1. Ve a [Supabase Dashboard](https://app.supabase.com/)
2. SQL Editor
3. Ejecuta:

```sql
SELECT id, subdomain, store_name, is_active 
FROM public.stores 
WHERE subdomain = 'reposteria';
```

Deberías ver la tienda de repostería con `is_active = true`.

Si no existe, ejecuta el script `scripts/34-create-reposteria-store.sql`.

## 🚀 Paso 3: Iniciar el Servidor de Desarrollo

En una terminal, desde la raíz del proyecto:

```bash
pnpm dev
```

Espera a que el servidor esté listo (verás algo como):
```
✓ Ready in X seconds
○ Local: http://localhost:3000
```

## 🚀 Paso 4: Probar el Subdominio

Abre tu navegador y accede a:

```
http://reposteria.localhost:3000
```

### ¿Qué deberías ver?

1. **Si todo funciona correctamente:**
   - La página carga normalmente
   - En la consola del navegador (F12), deberías ver headers con `x-store-id` y `x-store-subdomain`
   - Los productos deberían filtrarse por la tienda de repostería

2. **Si ves "Tienda no encontrada":**
   - Verifica que ejecutaste el script 34 en Supabase
   - Verifica que el subdominio en la base de datos es exactamente `reposteria`
   - Revisa la consola del servidor para ver errores

3. **Si no carga:**
   - Verifica que el archivo hosts está configurado correctamente
   - Verifica que el servidor está corriendo en el puerto 3000
   - Intenta limpiar la caché del navegador

## 🔍 Verificar que Funciona

### 1. Verificar Headers del Middleware

Abre las DevTools del navegador (F12):
- Ve a la pestaña **Network**
- Recarga la página
- Click en la primera petición (generalmente el documento HTML)
- Ve a la pestaña **Headers**
- Busca en **Response Headers**:
  - `x-store-id` - Debería tener un UUID
  - `x-store-subdomain` - Debería ser `reposteria`
  - `x-store-name` - Debería ser `Tienda de Repostería`

### 2. Verificar Cookie

En DevTools:
- Ve a **Application** (o **Almacenamiento**)
- Click en **Cookies** → `http://reposteria.localhost:3000`
- Deberías ver una cookie `store_id` con el UUID de la tienda

### 3. Verificar en la Consola

Abre la consola del navegador (F12 → Console) y ejecuta:

```javascript
// Verificar cookie
document.cookie.split(';').find(c => c.includes('store_id'))

// Verificar hostname
window.location.hostname // Debería ser 'reposteria.localhost'
```

## 🐛 Solución de Problemas

### El subdominio no resuelve

**Problema:** `ping reposteria.localhost` no funciona

**Solución:**
- Verifica que agregaste la línea correcta en `/etc/hosts`
- En Linux/Mac, asegúrate de usar `sudo` al editar
- En Windows, asegúrate de abrir Bloc de notas como administrador
- Reinicia el navegador después de modificar hosts

### El middleware no detecta el subdominio

**Problema:** Los headers `x-store-id` no aparecen

**Solución:**
- Verifica que el middleware está actualizado (debería detectar `reposteria.localhost`)
- Revisa los logs del servidor para ver errores
- Verifica que la tienda existe en Supabase con subdominio `reposteria`

### La tienda no se encuentra

**Problema:** Aparece la página "Tienda no encontrada"

**Solución:**
1. Verifica en Supabase que la tienda existe:
```sql
SELECT * FROM public.stores WHERE subdomain = 'reposteria';
```

2. Verifica que `is_active = TRUE`

3. Revisa los logs del middleware en la consola del servidor

### El navegador muestra "localhost" en lugar de "reposteria.localhost"

**Problema:** Al acceder, la URL cambia a `localhost:3000`

**Solución:**
- Asegúrate de escribir la URL completa: `http://reposteria.localhost:3000`
- No uses `localhost` directamente
- Limpia la caché del navegador

## 🎯 Próximos Pasos

Una vez que el subdominio funcione en local:

1. **Agregar productos** a la tienda de repostería
2. **Personalizar estilos** específicos para repostería
3. **Probar el filtrado** de productos por tienda
4. **Configurar DNS** para producción

## 📝 Notas Importantes

- El archivo `hosts` solo afecta tu computadora local
- No necesitas reiniciar el servidor después de modificar hosts
- Puedes agregar múltiples subdominios en hosts:
  ```
  127.0.0.1    reposteria.localhost
  127.0.0.1    electronica.localhost
  127.0.0.1    ropa.localhost
  ```
- En producción, necesitarás configurar DNS real en tu proveedor

---

¿Necesitas ayuda? Revisa los logs del servidor y la consola del navegador para más detalles.

