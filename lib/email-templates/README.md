# Plantillas de correo

Plantillas HTML para correos de la tienda OSORIA. El estilo está alineado con el correo de **confirmación de pedido** (`/api/orders/send-confirmation-email`).

## Confirmación de cuenta (`account-confirmation.html`)

Correo que envía **Supabase Auth** cuando un usuario se registra. Para usarlo:

1. Abre el [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Authentication** → **Email Templates**.
2. Elige la plantilla **Confirm signup**.
3. En **Subject** puedes usar por ejemplo: `Confirma tu cuenta en OSORIA`.
4. En **Body (HTML)** pega el contenido completo del archivo `account-confirmation.html`.
5. Guarda los cambios.

Asegúrate de tener configurado **Site URL** en **Authentication** → **URL Configuration** (por ejemplo `https://tu-dominio.com` o `http://localhost:3000`). Así el logo y los iconos (`/logo-negro.png`, `/icon-facebook.png`, `/icon-instagram.png`) se cargarán correctamente en el correo.

Variables de Supabase usadas en la plantilla:

- `{{ .ConfirmationURL }}` – Enlace para confirmar la cuenta.
- `{{ .SiteURL }}` – URL de tu sitio (logo e iconos).

## Recuperación de contraseña (paso manual)

Correo que envía **Supabase Auth** cuando alguien pide restablecer su contraseña. La pantalla `/auth/reset-password` prefiere el formato `token_hash`, que Supabase **no** emite por defecto: hay que editar la plantilla a mano.

**Requisito previo: SMTP propio.** Supabase no deja editar las plantillas mientras el proyecto usa su remitente por defecto. Configura tu SMTP en **Authentication** → **Emails** → **SMTP Settings** antes de seguir.

1. Abre el [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Authentication** → **Email Templates**.
2. Elige la plantilla **Reset Password**.
3. En **Body (HTML)** deja el enlace así:

```html
<a href="{{ if .RedirectTo }}{{ .RedirectTo }}{{ else }}{{ .SiteURL }}/auth/reset-password{{ end }}?token_hash={{ .TokenHash }}&type=recovery">Restablecer mi contraseña</a>
```

4. Guarda los cambios.

Por qué `{{ .RedirectTo }}` y no `{{ .SiteURL }}`: la plantilla es una sola y los tenants son muchos subdominios. `.RedirectTo` lleva el origen desde el que se pidió el correo, así que la persona vuelve a **su** tienda. La rama `{{ else }}` está para que un correo ya encolado sin `redirect_to` no genere un enlace sin host.

En **Authentication** → **URL Configuration**, los **Redirect URLs** deben permitir `https://*.osoria.help/**`. Si el origen no está en la lista, GoTrue descarta el `redirect_to` y cae en silencio al Site URL, y el enlace lleva a la tienda equivocada.

Mientras la plantilla no se edite, la recuperación sigue funcionando: la pantalla también acepta el `?code` que envía la plantilla por defecto.
