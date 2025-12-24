# 📧 Configuración de Envío de Correos

## Pasos para Configurar el Envío de Correos

### 1. Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local` con el siguiente contenido:

```env
# Configuración SMTP para envío de correos de confirmación de pedidos
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_FROM="Tu Tienda <tu-email@gmail.com>"
```

### 2. Configurar Gmail (Recomendado)

#### Para usar Gmail como servidor SMTP:

1. **Activa la verificación en 2 pasos** en tu cuenta de Google:
   - Ve a: https://myaccount.google.com/security
   - Activa "Verificación en dos pasos"

2. **Genera una "Contraseña de aplicación"**:
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" como aplicación
   - Selecciona "Otro (nombre personalizado)" como dispositivo
   - Ingresa "Ecommerce App" como nombre
   - Haz clic en "Generar"
   - **Copia la contraseña de 16 caracteres** que se genera

3. **Actualiza `.env.local`** con tus datos:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # La contraseña de aplicación de 16 caracteres (sin espacios)
   SMTP_FROM="Tu Tienda <tu-email@gmail.com>"
   

### 3. Configurar con Zoho Mail (Recomendado para negocios)

#### Para usar Zoho Mail como servidor SMTP:

1. **Habilita el acceso IMAP/SMTP en Zoho**:
   - Inicia sesión en tu cuenta de Zoho Mail
   - Ve a Configuración → Seguridad
   - Habilita "Acceso IMAP/SMTP" o "Acceso de aplicación"
   - Si es necesario, genera una "Contraseña de aplicación" específica

2. **Configuración en `.env.local`**:
   ```env
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=587
   SMTP_USER=tu-email@zoho.com
   SMTP_PASS=tu-contraseña-o-contraseña-de-aplicacion
   SMTP_FROM="Tu Tienda <tu-email@zoho.com>"
   ```

3. **Para Zoho Mail con dominio personalizado** (ej: tu-email@tudominio.com):
   ```env
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=587
   SMTP_USER=tu-email@tudominio.com
   SMTP_PASS=tu-contraseña
   SMTP_FROM="Tu Tienda <tu-email@tudominio.com>"
   ```

**Notas importantes para Zoho:**
- El puerto 587 usa TLS (recomendado)
- Si necesitas usar SSL, cambia el puerto a 465 y asegúrate de que `secure: true` en el código
- Zoho puede requerir una "Contraseña de aplicación" en lugar de tu contraseña normal
- Para generar contraseña de aplicación: Configuración → Seguridad → Contraseñas de aplicación

### 4. Otras Opciones de SMTP

#### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=tu-email@outlook.com
SMTP_PASS=tu-contraseña
SMTP_FROM="Tu Tienda <tu-email@outlook.com>"
```

#### Yahoo:
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=tu-email@yahoo.com
SMTP_PASS=tu-contraseña
SMTP_FROM="Tu Tienda <tu-email@yahoo.com>"
```

### 5. Reiniciar el Servidor

Después de crear o modificar `.env.local`, **reinicia el servidor de desarrollo**:
- Detén el servidor (Ctrl+C)
- Ejecuta `npm run dev` nuevamente

### 6. Probar el Envío

1. Realiza un pedido de prueba en la tienda
2. Completa el formulario de checkout
3. El correo se enviará automáticamente al email del cliente

### 7. Verificar que Funciona

Si todo está configurado correctamente, deberías ver en la consola del servidor:
```
✅ Correo enviado exitosamente: <message-id>
```

Si hay errores, verás mensajes específicos que te indicarán qué está mal.

## ⚠️ Notas Importantes

- **NO subas `.env.local` al repositorio** (ya está en .gitignore)
- **Usa contraseñas de aplicación**, no tu contraseña normal de email
- **En producción**, configura estas mismas variables en tu plataforma de hosting (Vercel, etc.)

## 🔍 Depuración

Si el correo no se envía:

1. Verifica que todas las variables estén en `.env.local`
2. Verifica que el servidor se haya reiniciado después de crear el archivo
3. Revisa los logs en la consola del servidor
4. Si usas Gmail, asegúrate de usar una contraseña de aplicación, no tu contraseña normal
5. El HTML del correo se guarda en `tmp/email-*.html` para revisión en desarrollo

