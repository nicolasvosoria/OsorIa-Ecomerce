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
