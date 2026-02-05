# Configuración SMTP para correos de confirmación de pedidos

Puedes usar **cualquier proveedor de correo** (Gmail, Outlook, correo de tu propio dominio, etc.). Solo necesitas el servidor SMTP, puerto y credenciales correctos.

En `.env.local` configura:

```env
SMTP_HOST=servidor-del-proveedor
SMTP_PORT=587
SMTP_USER=tu-email@tudominio.com
SMTP_PASS=tu-contraseña
SMTP_FROM="OSORIA <noreply@tudominio.com>"
```

---

## Por proveedor

### Gmail
| Variable   | Valor |
|-----------|--------|
| SMTP_HOST | `smtp.gmail.com` |
| SMTP_PORT | `587` |
| SMTP_USER | Tu email completo (ej. `tienda@gmail.com`) |
| SMTP_PASS | [Contraseña de aplicación](https://myaccount.google.com/apppasswords) (no la contraseña normal) |

---

### Outlook / Hotmail / Live (cuenta personal)
| Variable   | Valor |
|-----------|--------|
| SMTP_HOST | `smtp-mail.outlook.com` |
| SMTP_PORT | `587` |
| SMTP_USER | Tu email (ej. `contacto@outlook.com`) |
| SMTP_PASS | Tu contraseña de la cuenta |

---

### Microsoft 365 / Office 365 (correo de empresa)
| Variable   | Valor |
|-----------|--------|
| SMTP_HOST | `smtp.office365.com` |
| SMTP_PORT | `587` |
| SMTP_USER | Tu email (ej. `ventas@miempresa.com`) |
| SMTP_PASS | Contraseña de la cuenta |

---

### Yahoo
| Variable   | Valor |
|-----------|--------|
| SMTP_HOST | `smtp.mail.yahoo.com` |
| SMTP_PORT | `587` |
| SMTP_USER | Tu email Yahoo |
| SMTP_PASS | [Contraseña de aplicación](https://login.yahoo.com/account/security) |

---

### Zoho Mail

**Cuenta personal** (ej. `tuusuario@zoho.com`):

| Variable   | Valor |
|-----------|--------|
| SMTP_HOST | `smtp.zoho.com` |
| SMTP_PORT | `587` (recomendado) o `465` |
| SMTP_USER | Tu email completo (ej. `contacto@zoho.com`) |
| SMTP_PASS | Tu contraseña de Zoho (si tienes 2FA: [contraseña de aplicación](https://accounts.zoho.com/home#security/application_passwords)) |

**Cuenta de organización** (correo con tu dominio, ej. `noreply@tudominio.com`):

| Variable   | Valor |
|-----------|--------|
| SMTP_HOST | `smtppro.zoho.com` (o `smtppro.zoho.in` en India) |
| SMTP_PORT | `587` (recomendado) o `465` |
| SMTP_USER | Tu email completo (ej. `noreply@tudominio.com`) |
| SMTP_PASS | Contraseña del buzón (o contraseña de aplicación si tienes 2FA) |

---

### Correo con tu propio dominio (cPanel, hosting, Plesk, etc.)

El **hosting donde está tu correo** (ej. `noreply@osoria.com`) suele dar datos SMTP en el panel o en la documentación. Ejemplo típico:

| Variable   | Valor (ejemplo) |
|-----------|------------------|
| SMTP_HOST | `mail.tudominio.com` o `smtp.tudominio.com` |
| SMTP_PORT | `587` (recomendado) o `465` (SSL) |
| SMTP_USER | Email completo: `noreply@tudominio.com` |
| SMTP_PASS | Contraseña del buzón de correo |
| SMTP_FROM | `"OSORIA <noreply@tudominio.com>"` |

- Si el hosting no indica el servidor, suele ser `mail.tudominio.com` o el mismo dominio.
- Puerto **587** (TLS) es el más común; **465** es SSL. El código detecta 465 como conexión segura.

---

### Otros servicios (SendGrid, Mailgun, Resend, etc.)

Estos servicios dan un **usuario y contraseña SMTP** en su panel. Usa:

- **SMTP_HOST** y **SMTP_PORT** que te indiquen (ej. `smtp.sendgrid.net`, puerto 587).
- **SMTP_USER** y **SMTP_PASS** que te generen (a veces son una API key como usuario).

Siempre revisa la sección “SMTP” o “Integración” en la documentación del servicio.

---

## Resumen

1. **SMTP_HOST** y **SMTP_PORT**: los del proveedor (tablas arriba o documentación).
2. **SMTP_USER**: correo completo con el que envías.
3. **SMTP_PASS**: contraseña del correo o “contraseña de aplicación” si el proveedor lo pide (Gmail, Yahoo).
4. **SMTP_FROM**: nombre y correo que verá el cliente, ej. `"OSORIA <noreply@tudominio.com>"`.

Después de cambiar `.env.local`, reinicia el servidor (`pnpm dev` o `npm run dev`).
