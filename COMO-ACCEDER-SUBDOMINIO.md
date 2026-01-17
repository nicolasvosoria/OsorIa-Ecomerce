# 🌐 Cómo Acceder a un Subdominio Local

Esta guía te explica paso a paso cómo configurar y acceder a un subdominio en tu proyecto local.

## 📋 Pasos para Acceder a un Subdominio

### Paso 1: Crear la Tienda en Supabase

Antes de configurar el subdominio, necesitas crear la tienda en tu base de datos Supabase.

1. **Ve al SQL Editor de Supabase**
2. **Ejecuta este SQL** (reemplaza `'tu-subdominio'` con el nombre que quieras):

```sql
INSERT INTO public.stores (
  subdomain,
  store_name,
  domain,
  is_active,
  is_public,
  currency_code,
  primary_color,
  secondary_color
) VALUES (
  'tu-subdominio',              -- ⚠️ CAMBIA ESTO por el nombre que quieras (ej: 'electronica', 'ropa', 'alimentos')
  'Nombre de Tu Tienda',        -- Nombre que se mostrará
  'localhost',                  -- Dominio (localhost para desarrollo)
  TRUE,                         -- Tienda activa
  TRUE,                         -- Tienda pública
  'COP',                        -- Moneda
  '#4a5568',                    -- Color primario (opcional)
  '#5daba8'                     -- Color secundario (opcional)
) ON CONFLICT (subdomain) DO UPDATE SET
  store_name = EXCLUDED.store_name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

**Ejemplo**: Si quieres crear una tienda llamada "Electrónica":

```sql
INSERT INTO public.stores (
  subdomain,
  store_name,
  domain,
  is_active,
  is_public,
  currency_code
) VALUES (
  'electronica',
  'Tienda de Electrónica',
  'localhost',
  TRUE,
  TRUE,
  'COP'
) ON CONFLICT (subdomain) DO UPDATE SET
  store_name = EXCLUDED.store_name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

### Paso 2: Configurar el Archivo Hosts en Windows

#### Opción A: Usar el Script PowerShell (Recomendado)

1. **Abre PowerShell como Administrador**:
   - Presiona `Win + X`
   - Selecciona "Windows PowerShell (Administrador)" o "Terminal (Administrador)"

2. **Navega a tu proyecto**:
   ```powershell
   cd "C:\Users\Paola\OneDrive\Documentos\GitHub\OsorIa-Ecomerce"
   ```

3. **Edita el script** `scripts/configurar-hosts.ps1` y agrega tu subdominio:
   ```powershell
   $subdomains = @(
       "reposteria.localhost",
       "default.localhost",
       "tu-subdominio.localhost"  # ⬅️ Agrega tu subdominio aquí
   )
   ```

4. **Ejecuta el script**:
   ```powershell
   .\scripts\configurar-hosts.ps1
   ```

#### Opción B: Configuración Manual del Archivo Hosts

1. **Abre el Bloc de notas como Administrador**:
   - Presiona `Win + R`
   - Escribe: `notepad`
   - Presiona `Ctrl + Shift + Enter` (para abrir como administrador)

2. **Abre el archivo hosts**:
   - Ve a: `Archivo` → `Abrir`
   - Navega a: `C:\Windows\System32\drivers\etc\`
   - Cambia el filtro de "Documentos de texto" a "Todos los archivos"
   - Selecciona `hosts`

3. **Agrega tu subdominio** al final del archivo:
   ```
   127.0.0.1    localhost
   127.0.0.1    reposteria.localhost
   127.0.0.1    default.localhost
   127.0.0.1    tu-subdominio.localhost    ⬅️ Agrega esta línea
   ```

4. **Guarda el archivo** (`Ctrl + S`)

### Paso 3: Verificar la Configuración

Verifica que el subdominio resuelve correctamente:

```powershell
# En PowerShell o CMD
ping tu-subdominio.localhost
```

Debería responder con `127.0.0.1`.

### Paso 4: Iniciar el Servidor

Si no está corriendo, inicia el servidor de desarrollo:

```bash
npm run dev
# O
pnpm dev
```

### Paso 5: Acceder al Subdominio

Abre tu navegador y accede a:

```
http://tu-subdominio.localhost:3000
```

**Ejemplo**: Si creaste una tienda con subdominio `electronica`:
```
http://electronica.localhost:3000
```

## ✅ Verificación

Para verificar que todo funciona:

1. **El middleware detecta el subdominio**: Abre las Developer Tools (F12) → Network → Headers → Busca `x-store-id` y `x-store-subdomain`
2. **La tienda se carga correctamente**: Deberías ver el contenido de tu tienda
3. **No hay errores en la consola**: Revisa la consola del navegador (F12 → Console)

## 🔍 Troubleshooting

### El subdominio no carga

1. **Verifica que el archivo hosts tiene la entrada**:
   ```powershell
   Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String "tu-subdominio"
   ```

2. **Verifica que la tienda existe en Supabase**:
   ```sql
   SELECT * FROM public.stores WHERE subdomain = 'tu-subdominio';
   ```

3. **Reinicia el navegador** después de modificar el archivo hosts

4. **Verifica que el servidor está corriendo** en el puerto 3000

### Error "Tienda no encontrada"

1. **Verifica que la tienda existe** en Supabase con el subdominio correcto
2. **Verifica que `is_active = TRUE`** en la tabla `stores`
3. **Verifica que la función `get_store_by_subdomain` existe**:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'get_store_by_subdomain';
   ```

### El subdominio no resuelve

1. **Limpia la caché DNS de Windows**:
   ```powershell
   ipconfig /flushdns
   ```

2. **Reinicia el navegador completamente** (cierra todas las ventanas)

3. **Verifica que no hay espacios extra** en el archivo hosts

## 📝 Ejemplos de Subdominios

Aquí tienes algunos ejemplos de cómo crear diferentes tiendas:

### Tienda de Electrónica
```sql
INSERT INTO public.stores (subdomain, store_name, domain, is_active, is_public, currency_code)
VALUES ('electronica', 'Tienda de Electrónica', 'localhost', TRUE, TRUE, 'COP');
```
Acceso: `http://electronica.localhost:3000`

### Tienda de Ropa
```sql
INSERT INTO public.stores (subdomain, store_name, domain, is_active, is_public, currency_code)
VALUES ('ropa', 'Tienda de Ropa', 'localhost', TRUE, TRUE, 'COP');
```
Acceso: `http://ropa.localhost:3000`

### Tienda de Alimentos
```sql
INSERT INTO public.stores (subdomain, store_name, domain, is_active, is_public, currency_code)
VALUES ('alimentos', 'Tienda de Alimentos', 'localhost', TRUE, TRUE, 'COP');
```
Acceso: `http://alimentos.localhost:3000`

## 🎯 Resumen Rápido

1. ✅ Crea la tienda en Supabase con el subdominio
2. ✅ Agrega `127.0.0.1    tu-subdominio.localhost` al archivo hosts
3. ✅ Inicia el servidor: `npm run dev`
4. ✅ Accede a: `http://tu-subdominio.localhost:3000`

¡Listo! Ya puedes acceder a tu subdominio. 🚀
