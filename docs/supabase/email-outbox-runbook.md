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

## Activar en la slice 7 (referencia, no ejecutar desde aquí)

1. `supabase secrets set RESEND_API_KEY=... EMAIL_WORKER_CRON_SECRET=<mismo valor que quedó en Vault>` en el proyecto `nwsmwuaixlynqylvgfmr`.
2. `supabase functions deploy email-worker`.
3. `select cron.alter_job(job_id := jobid, active := true) from cron.job where jobname in ('email-outbox-worker', 'email-outbox-prune');`
4. Smoke test: forzar una verificación de buzón desde `/admin/settings`, confirmar que la fila de `email_outbox` pasa a `sent` dentro de 2 minutos y que el correo llega.

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
