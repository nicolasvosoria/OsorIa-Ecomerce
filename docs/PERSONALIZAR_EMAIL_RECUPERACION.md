# Personalizar Email de Recuperación de Contraseña

## Opción 1: Personalizar desde Supabase Dashboard (Recomendado)

### Pasos:

1. **Accede a Supabase Dashboard:**
   - Ve a [Supabase Dashboard](https://app.supabase.com)
   - Selecciona tu proyecto

2. **Navega a Email Templates:**
   - Ve a **Authentication** → **Email Templates**
   - Busca el template **"Reset Password"** o **"Change Password"**

3. **Personaliza el Template:**
   - Haz clic en el template para editarlo
   - Puedes modificar:
     - **Subject** (Asunto del email)
     - **Body** (Cuerpo del email en HTML)

4. **Variables Disponibles:**
   - `{{ .ConfirmationURL }}` - URL del link de recuperación
   - `{{ .Email }}` - Email del usuario
   - `{{ .Token }}` - Token de recuperación (si lo necesitas)
   - `{{ .TokenHash }}` - Hash del token
   - `{{ .SiteURL }}` - URL de tu sitio

5. **Guarda los Cambios:**
   - Haz clic en **Save** para guardar el template personalizado

## Opción 2: Template HTML Personalizado

### Ejemplo de Template Básico:

```html
<h2>Recuperar Contraseña</h2>
<p>Hola,</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
<p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #005aa1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
    Restablecer Contraseña
  </a>
</p>
<p>Si no solicitaste este cambio, puedes ignorar este email.</p>
<p>Este link expirará en 1 hora.</p>
<p>Saludos,<br>El equipo de Osoria</p>
```

### Ejemplo de Template Avanzado (con estilos):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #005aa1;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 5px 5px;
    }
    .button {
      display: inline-block;
      background-color: #005aa1;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Osoria</h1>
    </div>
    <div class="content">
      <h2>Recuperar tu Contraseña</h2>
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada a <strong>{{ .Email }}</strong>.</p>
      <p>Si fuiste tú quien solicitó este cambio, haz clic en el siguiente botón para crear una nueva contraseña:</p>
      <p style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Restablecer Contraseña</a>
      </p>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p style="word-break: break-all; color: #005aa1;">{{ .ConfirmationURL }}</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 14px; color: #666;">
        <strong>¿No solicitaste este cambio?</strong><br>
        Si no fuiste tú, puedes ignorar este email de forma segura. Tu contraseña no será modificada.
      </p>
      <p style="font-size: 14px; color: #666;">
        <strong>Importante:</strong> Este link expirará en 1 hora por seguridad.
      </p>
    </div>
    <div class="footer">
      <p>Este es un email automático, por favor no respondas a este mensaje.</p>
      <p>&copy; 2024 Osoria. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
```

### Ejemplo de Template en Español (Simple):

```html
<h2>Recuperación de Contraseña - Osoria</h2>
<p>Estimado/a usuario/a,</p>
<p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Osoria.</p>
<p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #005aa1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
    Crear Nueva Contraseña
  </a>
</p>
<p><strong>Este enlace expirará en 1 hora.</strong></p>
<p>Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu contraseña actual no será modificada.</p>
<p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
<p>Saludos cordiales,<br><strong>Equipo de Osoria</strong></p>
```

## Personalizar el Asunto del Email

En Supabase Dashboard, también puedes cambiar el **Subject** (asunto) del email:

### Ejemplos de Asuntos:

```
Recuperar tu Contraseña - Osoria
Restablecer Contraseña de tu Cuenta
Solicitud de Cambio de Contraseña
Recuperación de Acceso - Osoria
```

## Configuración Adicional

### Cambiar el Remitente del Email

1. Ve a **Authentication** → **Settings**
2. Busca **SMTP Settings** o **Email Settings**
3. Configura tu proveedor de email personalizado (opcional)
4. O usa el servicio de email por defecto de Supabase

### Cambiar el Tiempo de Expiración

El tiempo de expiración del link se configura en:
- **Authentication** → **URL Configuration**
- Busca "JWT expiry" o configuración de expiración
- Por defecto es 1 hora

## Variables Disponibles en Templates

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | URL completa del link de recuperación | `https://tu-sitio.com/auth/reset-password#access_token=...` |
| `{{ .Email }}` | Email del usuario | `usuario@example.com` |
| `{{ .Token }}` | Token de recuperación | `abc123...` |
| `{{ .TokenHash }}` | Hash del token | `xyz789...` |
| `{{ .SiteURL }}` | URL base de tu sitio | `https://tu-sitio.com` |
| `{{ .RedirectTo }}` | URL de redirección configurada | `/auth/reset-password` |

## Prueba del Template

Para probar tu template personalizado:

1. Guarda el template en Supabase Dashboard
2. Solicita una recuperación de contraseña desde tu aplicación
3. Revisa el email recibido
4. Verifica que:
   - El asunto sea el correcto
   - El diseño se vea bien
   - El link funcione correctamente
   - El mensaje sea claro y profesional

## Notas Importantes

- **HTML válido:** Asegúrate de que el HTML sea válido
- **Responsive:** Considera que muchos usuarios verán el email en móviles
- **Accesibilidad:** Usa colores con buen contraste
- **Pruebas:** Prueba el email en diferentes clientes (Gmail, Outlook, etc.)
- **Link funcional:** Siempre incluye `{{ .ConfirmationURL }}` para que el link funcione

## Ejemplo de Template Minimalista

Si prefieres algo más simple:

```html
<p>Hola,</p>
<p>Para restablecer tu contraseña, haz clic aquí:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer Contraseña</a></p>
<p>Este link expira en 1 hora.</p>
<p>Si no solicitaste este cambio, ignora este email.</p>
```

