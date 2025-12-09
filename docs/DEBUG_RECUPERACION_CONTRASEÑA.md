# Debug: Link de Recuperación de Contraseña No Redirige

## Pasos para Diagnosticar el Problema

### 1. Verificar la URL del Link en el Email

Cuando recibas el email de recuperación, verifica:

1. **¿A dónde apunta el link?**
   - Debería ser algo como: `https://tu-proyecto.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:3000/auth/reset-password`
   - O directamente: `http://localhost:3000/auth/reset-password#access_token=...&type=recovery`

2. **¿El link tiene el hash correcto?**
   - Debe incluir `#access_token=...` y `type=recovery`
   - Si no tiene hash, Supabase no está configurado correctamente

### 2. Verificar Configuración en Supabase Dashboard

**CRÍTICO:** Verifica que las URLs estén configuradas:

1. Ve a **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. En **Redirect URLs**, debe estar exactamente:
   ```
   http://localhost:3000/auth/reset-password
   ```
   (Sin barra al final, sin parámetros)

3. Verifica que no haya espacios o caracteres extra

### 3. Verificar en la Consola del Navegador

Cuando hagas clic en el link, abre la consola del navegador (F12) y busca:

```
[ResetPassword] URL completa: ...
[ResetPassword] Hash: ...
[ResetPassword] Token encontrado: ...
```

**Si no ves estos logs:**
- La página no se está cargando
- Hay un error de JavaScript
- La ruta no existe

**Si ves los logs pero dice "No hay token":**
- El hash no está en la URL
- Supabase no está redirigiendo correctamente

### 4. Verificar la URL de Redirección en el Código

El código actual usa:
```typescript
const redirectUrl = `${window.location.origin}/auth/reset-password`
```

Esto debería generar:
- Desarrollo: `http://localhost:3000/auth/reset-password`
- Producción: `https://tu-dominio.com/auth/reset-password`

### 5. Problemas Comunes y Soluciones

#### Problema: El link redirige a Supabase pero no a tu página

**Causa:** La URL de redirección no está en la lista de URLs permitidas en Supabase.

**Solución:**
1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Agrega la URL exacta (sin trailing slash)
3. Guarda y espera unos minutos
4. Solicita un nuevo link de recuperación

#### Problema: El link redirige pero muestra "Link inválido"

**Causa:** El token no se está procesando correctamente o expiró.

**Solución:**
1. Verifica en la consola qué dice el log
2. Asegúrate de usar el link completo del email (no lo copies parcialmente)
3. Solicita un nuevo link si el anterior expiró (1 hora por defecto)

#### Problema: El link no tiene hash (#access_token=...)

**Causa:** Supabase está usando query params en lugar de hash, o la configuración está mal.

**Solución:**
1. Verifica que la URL de redirección esté configurada correctamente
2. El código actual maneja solo hash, puede que necesites ajustar si Supabase usa query params

#### Problema: Error "Invalid redirect URL"

**Causa:** La URL no está en la lista de URLs permitidas.

**Solución:**
1. Ve a Supabase Dashboard
2. Agrega la URL exacta que aparece en el error
3. No uses wildcards, especifica la URL completa

### 6. Probar Manualmente

Para probar si el problema es del link o de la página:

1. **Crea un link de prueba:**
   - Solicita recuperación de contraseña
   - Copia el link completo del email

2. **Modifica la URL manualmente:**
   - Si el link es: `https://tu-proyecto.supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000/auth/reset-password`
   - Debería redirigir a: `http://localhost:3000/auth/reset-password#access_token=...&type=recovery`

3. **Si la redirección funciona pero la página muestra error:**
   - El problema está en el código de la página
   - Revisa los logs en la consola

4. **Si la redirección no funciona:**
   - El problema está en la configuración de Supabase
   - Verifica las URLs permitidas

### 7. Verificar Variables de Entorno

Asegúrate de que `.env.local` tenga:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
```

**Importante:** 
- No debe tener espacios
- No debe tener comillas
- Debe ser la URL completa (con https://)

### 8. Logs de Debug Mejorados

El código ahora incluye logs detallados. Cuando hagas clic en el link, deberías ver en la consola:

```
[ResetPassword] URL completa: http://localhost:3000/auth/reset-password#access_token=...
[ResetPassword] Hash: #access_token=...&type=recovery
[ResetPassword] Token encontrado: { type: 'recovery', hasAccessToken: true, ... }
[ResetPassword] Token de recuperación encontrado, procesando...
[ResetPassword] Sesión establecida correctamente
```

Si no ves estos logs, hay un problema anterior en el flujo.

### 9. Solución Rápida: Forzar el Procesamiento del Token

Si el token está en el hash pero no se procesa, el código ahora intenta:

1. Procesar automáticamente (Supabase lo hace)
2. Si falla, usar `setSession()` manualmente
3. Si falla, esperar y verificar de nuevo

### 10. Checklist Final

Antes de reportar un problema, verifica:

- [ ] La URL está en Supabase Dashboard → Authentication → URL Configuration
- [ ] La URL es exacta (sin trailing slash, sin parámetros)
- [ ] Las variables de entorno están configuradas
- [ ] El servidor local está corriendo en el puerto correcto
- [ ] El link del email es completo (no copiado parcialmente)
- [ ] El link no ha expirado (menos de 1 hora)
- [ ] Revisaste la consola del navegador para ver los logs
- [ ] Revisaste la consola del servidor para ver errores

## Contacto

Si después de seguir estos pasos el problema persiste, proporciona:

1. Los logs de la consola del navegador
2. La URL completa del link del email (puedes ocultar el token)
3. La configuración de URLs en Supabase Dashboard (screenshot)
4. El mensaje de error exacto que ves

