# Runbook: outbox de correo (operación diaria)

v1 de observabilidad del outbox (D36): sin dashboard ni alertas externas.
Un operador con credenciales `service_role` corre estas consultas a mano, a
diario, contra la base de producción. Todo lo que aparece aquí vive detrás de
`ecommerce.email_outbox_health` (protegida: solo `service_role` puede leerla)
y de los logs estructurados que emite `supabase/functions/email-worker`.

> Esta rama solo autoriza el worker y sus cron jobs EN CÓDIGO; siguen
> **inactivos** hasta que la slice 7 los active contra el proyecto real
> (`nwsmwuaixlynqylvgfmr`). Hasta entonces esta consola no tiene tráfico que
> observar — el runbook queda listo para cuando lo tenga.

## Revisión diaria

```sql
select * from ecommerce.email_outbox_health;
```

Qué mirar:

- **`status = 'failed'` con `quota_failures > 0`.** El Free tier de Resend se
  agotó (D18): `daily_quota_exceeded` se resetea en 24h, `monthly_quota_exceeded`
  necesita subir de plan o esperar al ciclo. Ningún reintento automático va a
  resolver esto — son terminales por diseño (D16, la 4ª falla es terminal).
- **`status = 'failed'` sin `quota_failures`.** Revisar `last_error` /
  `last_error_code` de esas filas puntuales (query abajo) — puede ser un
  correo inválido, un dominio que rebota, etc.
- **`status = 'processing'` con filas viejas (`oldest_created_at` de hace
  horas).** El worker corre cada minuto y cada lease dura 2 minutos; si algo
  sigue `processing` mucho más que eso, el worker se cayó a mitad de un batch
  sin que el próximo tick lo haya reclamado todavía. Confirmar que el cron
  `email-outbox-worker` sigue `active` (`select active from cron.job where
  jobname = 'email-outbox-worker'`) antes de investigar más.

## Inspeccionar filas concretas

```sql
select id, store_id, template_kind, recipient_email, status, attempt_count,
       last_error_code, last_error, created_at, updated_at
from ecommerce.email_outbox
where status = 'failed'
order by updated_at desc
limit 50;
```

## Logs estructurados

El worker emite una línea JSON por invocación (`{"level":"info","msg":"email-outbox-worker
batch complete","claimed":N,"sent":N,"failed":N}`) y una por error de RPC
(`claim_email_outbox_batch` / `mark_email_outbox_sent` / `mark_email_outbox_failed`).
Se leen desde el dashboard de Supabase → Edge Functions → `email-worker` → Logs,
o vía `supabase functions logs email-worker` con el proyecto enlazado.

## Retención (D17)

`ecommerce.prune_email_outbox()` borra cualquier fila con más de 30 días
(`created_at`), vía el cron diario `email-outbox-prune` (`0 3 * * *`, también
inactivo hasta la slice 7). No hay "restaurar": una fila podada no vuelve.
Confirmar el conteo antes de una migración de datos manual si alguna vez hace
falta:

```sql
select count(*) from ecommerce.email_outbox where created_at < now() - interval '30 days';
```

## El worker nunca había arrancado de verdad hasta la slice 5

`lib/email/outbox-worker.ts` importaba `"./resend-client"` sin extensión.
Deno nunca resuelve un import relativo sin extensión completa (a diferencia
de webpack/vite/tsc, que sí lo hacen), así que `email-worker` nunca pudo
arrancar bajo el runtime real -- ni siquiera antes de la slice 5, se
comprobó arrancándolo contra un worktree aislado en `e4aabd8` con
`supabase functions serve`, mismo `503 BOOT_ERROR` que reportó el
verificador de la slice 5. Como el cron que lo invoca sigue inactivo hasta
esta sección, nadie lo había ejercitado de punta a punta desde la slice 2:
todo lo que "probaba" el worker era `tests/email/outbox-worker.test.ts`
sobre `runEmailOutboxWorkerBatch` con dependencias inyectadas y mockeadas --
nunca el módulo real bajo Deno. Corregido (la línea ahora importa
`"./resend-client.ts"`); `pnpm supabase:verify:functions-boot` (abajo) existe
para que esta clase de fallo no vuelva a pasar en silencio.

### `pnpm supabase:verify:functions-boot`

`scripts/check-edge-functions-boot.mjs` corre `deno info --json` (solo
resolución de grafo de módulos, nunca `deno check`: los dos entrypoints
cargan errores de tipos preexistentes y ajenos a este chequeo, de
`createClient()` sin el genérico `Database`, que harían fallar un `deno
check` por una razón que no tiene nada que ver con arrancar) contra cada
`supabase/functions/*/index.ts` y falla si algún import no resuelve a un
archivo real. Solo necesita el binario `deno` -- corre en CI sin Docker. Lo
que NO prueba: que la function arranca dentro del edge-runtime real (env
vars, APIs solo-Deno, la versión de Deno específica que empaqueta ese
runtime) -- eso solo lo prueba `supabase functions serve` + una petición
real, y sí necesita Docker. Antes de activar el worker o el hook en un
proyecto real, correr ambos:

```sh
pnpm supabase:verify:functions-boot
supabase functions serve --no-verify-jwt &
curl -i -X POST http://127.0.0.1:54321/functions/v1/email-worker -H "Authorization: Bearer <EMAIL_WORKER_CRON_SECRET local>"
curl -i -X POST http://127.0.0.1:54321/functions/v1/auth-email-hook
```

## Activar en la slice 7 (referencia, no ejecutar desde aquí)

1. `supabase secrets set RESEND_API_KEY=... EMAIL_WORKER_CRON_SECRET=<mismo valor que quedó en Vault>` en el proyecto `nwsmwuaixlynqylvgfmr`.
2. `supabase functions deploy email-worker`.
3. `select cron.alter_job(job_id := jobid, active := true) from cron.job where jobname in ('email-outbox-worker', 'email-outbox-prune');`
4. Smoke test: forzar una verificación de buzón desde `/admin/settings`, confirmar que la fila de `email_outbox` pasa a `sent` dentro de 2 minutos y que el correo llega.

## El Send Email Hook (slice 5) nace autorizado, no registrado

`supabase/functions/auth-email-hook` verifica firmas Standard Webhooks,
resuelve la tienda de un evento de Auth (vía el intent minteado por
`lib/auth/prepare-auth-redirect.ts`, o el `signup_store_id` del perfil para
`password_changed_notification`) y encola en el MISMO `ecommerce.email_outbox`
de la slice 2 -- nunca llama a Resend (eso lo sigue haciendo el worker de
`email-worker`, sin cambios). Verificado localmente invocándolo a mano con un
payload firmado a mano y con `tests/email/auth-hook.test.ts` /
`tests/security/standard-webhooks.test.ts` -- **no** está registrado contra
`[auth.hook.send_email]` en ningún config.toml de este repo, ni local ni de
producción: GoTrue solo acepta URIs `http://` en `localhost`/`127.0.0.1`/`::1`
(un contenedor no puede así invocar al de al lado por loopback), así que la
única forma real de probar el enganche completo es contra un proyecto real.

Activar en la slice 7:

1. `supabase secrets set AUTH_EMAIL_HOOK_SECRET=<el mismo v1,whsec_... que se registre abajo, sin el prefijo v1,>` en el proyecto `nwsmwuaixlynqylvgfmr`.
2. `supabase functions deploy auth-email-hook`.
3. En el dashboard de Supabase (Authentication → Hooks → Send Email) o vía la Management API: apuntar el hook a `https://nwsmwuaixlynqylvgfmr.supabase.co/functions/v1/auth-email-hook`, generar el secreto (formato `v1,whsec_<base64>`) y habilitarlo.
4. En el proyecto real (Authentication → Settings), replicar los dos toggles que este repo solo puede fijar en `supabase/config.toml` localmente: **Confirm email** (`enable_confirmations`) y **Notify user on password change** (el que enciende `[auth.email.notification.password_changed]` aquí).
5. Turnstile: `TURNSTILE_SECRET_KEY` (secreto del Worker/servidor, leído por `lib/security/turnstile.ts`) y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (clave pública del widget, `vercel env add`) para el sitekey real emitido en el dashboard de Cloudflare para `*.osoria.help` y `admin.osoria.help`. Hasta entonces, `verifyTurnstile()` sigue en su estado "no configurado" (D26): deja pasar la verificación y lo registra en el log en vez de bloquear el registro/recuperación -- ver el razonamiento en `lib/security/turnstile.ts`.
6. Smoke test: registrar una cuenta nueva desde el storefront de una tienda real, confirmar que `email_outbox` recibe la fila `signup-confirmation` con el remitente `Osoria <auth@mail.osoria.help>` y que el enlace vuelve al subdominio correcto.

## Invitaciones de dueño y de equipo (slice 6) también nacen sin enganchar el correo real

`lib/auth/platform-identity-invites.ts` reemplaza la contraseña temporal por
la invitación nativa de Supabase (D20): `createTenant` y `addStoreMember`
resuelven primero si el correo ya existe EN CUALQUIER PARTE de este proyecto
compartido (`ecommerce.find_auth_user_id_by_email`, nunca solo
`ecommerce.user_profiles`) y bifurcan:

- **Desconocido en todo el proyecto** → `auth.admin.inviteUserByEmail` mintea
  la identidad, la marca `app_metadata.invited_pending_password = true`
  (D22) y aprovisiona la membresía de inmediato. Si el aprovisionamiento
  falla después, `deleteInvitedIdentity` revierte exactamente esa identidad
  (nunca una preexistente) — las filas de `store_users`/`user_profiles`
  caen solas por `on delete cascade`.
- **Ya existe en el proyecto** (de este app o de otro) → D21: se mintea
  `ecommerce.pending_membership_invites` y se encola el correo
  `membership-acceptance` (D11); la membresía real solo se escribe cuando
  esa MISMA identidad autenticada la acepta explícitamente en
  `/auth/accept-membership`.

El correo de invitación nativo (`owner-invite`/`new-user-invite`) sigue el
mismo destino que todo lo demás desde la slice 5: se renderiza en
`supabase/functions/auth-email-hook` y cae en `ecommerce.email_outbox` —
pero ese Hook sigue **sin registrar** contra `[auth.hook.send_email]`
localmente (ver la sección de arriba), así que hoy GoTrue manda su propio
correo por SMTP a Inbucket en su lugar. Verificado localmente contra el
stack local, llamando `POST /auth/v1/invite` de verdad (mismo endpoint que
`auth.admin.inviteUserByEmail`) con el `redirect_to` que este código
construye: la identidad se crea, el `app_metadata.invited_pending_password`
escrito con `PUT /admin/users/:id` persiste y se confirmó viajando dentro
del JWT de la sesión una vez canjeado el token (`POST /auth/v1/verify` con
`type=invite`) — exactamente lo que `lib/auth/invited-session-gate.ts` lee
sin una consulta aparte a Postgres. También se confirmó que reinvitar un
correo YA CONFIRMADO (no uno todavía "invited") es lo único que devuelve
`email_exists` en este GoTrue (v2.194.0) — reinvitar uno todavía sin
confirmar simplemente reenvía, 200 — así que `inviteNewIdentity`'s manejo de
`email_exists` es una defensa contra la carrera entre la resolución previa
(`find_auth_user_id_by_email`) y esta llamada, no el camino principal de
detección (ese es el `select` contra `auth.users`).

D22's restricción global de la sesión invitada (`proxy.ts`,
`lib/auth/invited-session-gate.ts`) lee `app_metadata.invited_pending_
password` de la MISMA sesión que `getUser()` ya valida — nunca una consulta
aparte a Postgres. Si algún día hace falta desatascar a mano a alguien
atrapado ahí (un correo que nunca completó el alta), se limpia con el
Admin API, nunca con SQL directo (esa columna vive en `auth.users.raw_app_
meta_data`, no en ninguna tabla de `ecommerce`):

```ts
await authAdmin.auth.admin.updateUserById(userId, {
  app_metadata: { invited_pending_password: false },
});
```

`email_send_attempts.purpose` suma tres valores nuevos a los de la slice 5
(`mailbox_verification:*`, `auth:signup`, `auth:recovery`): `owner_invite`,
`new_user_invite` (D20, mismo namespace que `auth_intents.purpose`) y
`membership_invite` (D21). Mismo límite reusado (1/60s, 5/hora por tienda x
propósito x destinatario, D25) — ninguno es un limitador nuevo.

Activar en la slice 7: nada adicional específico de esta sección — el
enganche del Hook (arriba) ya cubre que estos dos correos empiecen a
renderizarse con la plantilla D11 real en vez del correo por defecto de
GoTrue. Sí confirmar que el proyecto real tiene `*.osoria.help` en su lista
de redirect URLs permitidos (Authentication → URL Configuration): sin eso,
`inviteUserByEmail` rechaza el `redirectTo` que este código ya construye con
`lib/email/urls.ts`.

## El gate de identidad del checkout (D7/A8/D31) también nace apagado

La slice 3 conecta el checkout a `getStoreIdentityReadiness()` (nombre público,
razón social, teléfono, dirección comercial, Reply-To verificado, buzón de
pedidos verificado), pero el rechazo real queda apagado hasta que cada tienda
haya tenido tiempo de completar esos datos por su cuenta desde
`/admin/settings`. El interruptor es una variable de entorno, no una fila de
base de datos, porque la regla vive en TS puro
(`lib/stores/identity-readiness.ts`) y no tiene un gemelo en SQL.

Activarlo en la slice 7: `vercel env add CHECKOUT_ENFORCE_STORE_IDENTITY_READINESS
production` con el valor `true`. Con el gate encendido, un checkout contra una
tienda incompleta falla ANTES de crear la orden (ningún pedido, ningún item,
ningún correo en cola) -- confirmar contra una tienda de prueba deliberadamente
incompleta antes de encenderlo en una tienda real.
