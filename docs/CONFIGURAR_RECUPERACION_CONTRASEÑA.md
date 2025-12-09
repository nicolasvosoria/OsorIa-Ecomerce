# Configuración de Recuperación de Contraseña

## Pasos Necesarios para que Funcione la Redirección

### 1. Configurar URLs de Redirección en Supabase Dashboard

**IMPORTANTE:** Este es el paso más crítico. Sin esto, Supabase rechazará las redirecciones.

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **URL Configuration**
3. En la sección **Redirect URLs**, agrega las siguientes URLs:

#### Para Desarrollo Local:
```
http://localhost:3000/auth/reset-password
http://localhost:3000/auth/callback
```

#### Para Producción:
```
https://tu-dominio.com/auth/reset-password
https://tu-dominio.com/auth/callback
```

**Nota:** Reemplaza `tu-dominio.com` con tu dominio real de producción.

4. Haz clic en **Save** para guardar los cambios

### 2. Verificar Variables de Entorno

Asegúrate de que tu archivo `.env.local` tenga las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
```

### 3. Verificar que el Código Esté Correcto

El código ya está configurado correctamente en:
- `lib/supabase/auth-api.ts` - Función `resetPassword()` que envía el email
- `app/auth/reset-password/page.tsx` - Página que procesa el token

### 4. Probar el Flujo Completo

1. **Solicitar recuperación:**
   - Ve a la página de login
   - Haz clic en "¿Olvidaste tu contraseña?"
   - Ingresa tu email
   - Haz clic en "Enviar link de recuperación"

2. **Revisar el email:**
   - Abre tu bandeja de entrada (o spam)
   - Busca el email de Supabase con el asunto "Reset your password"
   - Haz clic en el link del email

3. **Verificar la redirección:**
   - Deberías ser redirigido a: `http://localhost:3000/auth/reset-password#access_token=...&type=recovery`
   - La página debería mostrar el formulario para ingresar la nueva contraseña

4. **Restablecer contraseña:**
   - Ingresa tu nueva contraseña
   - Confirma la contraseña
   - Haz clic en "Restablecer Contraseña"
   - Deberías ver un mensaje de éxito y ser redirigido al inicio

## Solución de Problemas

### Error: "Invalid redirect URL"

**Causa:** La URL de redirección no está configurada en Supabase Dashboard.

**Solución:**
1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Agrega la URL exacta que aparece en el error
3. Guarda los cambios
4. Intenta nuevamente

### Error: "Link de recuperación inválido o expirado"

**Causa:** El token en el hash de la URL no se está procesando correctamente.

**Solución:**
1. Verifica que estés usando la URL completa del email (no la copies parcialmente)
2. Asegúrate de que el link no haya expirado (los links de Supabase expiran después de 1 hora por defecto)
3. Solicita un nuevo link de recuperación

### El token no se intercambia por sesión

**Causa:** El cliente de Supabase no está procesando el hash de la URL correctamente.

**Solución:**
1. Verifica que estés usando `@supabase/ssr` (ya está instalado)
2. Asegúrate de que el cliente se esté creando correctamente
3. Revisa la consola del navegador para ver los logs de `[ResetPassword]`

### El email no llega

**Causa:** El email puede estar en spam o hay un problema con la configuración de email de Supabase.

**Solución:**
1. Revisa tu carpeta de spam
2. Verifica que el email esté correcto
3. En Supabase Dashboard → Authentication → Email Templates, verifica que los templates estén configurados
4. Si usas un proveedor de email personalizado, verifica su configuración

## Configuración Adicional (Opcional)

### Personalizar el Email de Recuperación

1. Ve a Supabase Dashboard → Authentication → Email Templates
2. Selecciona "Reset Password"
3. Personaliza el template HTML
4. Asegúrate de incluir el link: `{{ .ConfirmationURL }}`

### Cambiar el Tiempo de Expiración del Token

Por defecto, los tokens de recuperación expiran en 1 hora. Para cambiarlo:

1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Busca "JWT expiry" o configuración de expiración
3. Ajusta el tiempo según tus necesidades

## Verificación Final

Para verificar que todo está funcionando:

1. ✅ URLs de redirección configuradas en Supabase Dashboard
2. ✅ Variables de entorno configuradas correctamente
3. ✅ Email de recuperación se envía correctamente
4. ✅ Link del email redirige a `/auth/reset-password`
5. ✅ Token se procesa y crea una sesión
6. ✅ Contraseña se actualiza exitosamente
7. ✅ Usuario es redirigido al inicio después del éxito

## Notas Importantes

- **Desarrollo:** Usa `http://localhost:3000` (sin HTTPS)
- **Producción:** Usa `https://tu-dominio.com` (con HTTPS)
- **Wildcards:** Supabase no soporta wildcards en las URLs de redirección, debes especificar cada URL exactamente
- **Múltiples entornos:** Si tienes staging y producción, agrega ambas URLs

## Ejemplo de URL de Redirección Correcta

```
✅ CORRECTO:
http://localhost:3000/auth/reset-password
https://mi-tienda.com/auth/reset-password

❌ INCORRECTO:
http://localhost:3000/auth/reset-password/
http://localhost:3000/auth/reset-password?param=value
http://localhost:3000/*
```

