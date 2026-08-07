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
  sigue `processing` mucho más que eso hay cuatro causas posibles, y
  `attempt_count`/`rejection_count`/`claim_generation`/`last_error_code`
  (misma query de "Inspeccionar filas concretas" de abajo, cambiando
  `where status = 'failed'` por `where status = 'processing'`) distinguen
  entre ellas:
  - `attempt_count` estático (no sube entre dos revisiones), `created_at`
    de menos de 20 horas. El worker no se está ejecutando. Confirmar que
    el cron `email-outbox-worker` sigue `active` (`select active from
    cron.job where jobname = 'email-outbox-worker'`) antes de investigar más.
  - `attempt_count` sube tick a tick, `rejection_count = 0` y `last_error_code`
    es nulo o viejo (no cambia entre reintentos). `mark_email_outbox_sent`
    está fallando de forma persistente para esa fila -- Resend ya la
    entregó, pero la marca no cuaja. Es la misma situación que
    `markSentFailed` en los logs estructurados (abajo) -- revisar ahí.
  - `attempt_count` sube tick a tick, `rejection_count = 0` y `last_error_code`
    SÍ cambia entre revisiones (`http_5xx`, `rate_limit_exceeded`,
    `concurrent_idempotent_requests`, `network_error`). Resend (o la red)
    está fallando de forma transitoria en el REENVÍO de esa fila -- que, por
    el propio idempotency-key de Resend, puede muy bien ser el mismo caso de
    arriba (una entrega que sí llegó, atrapada detrás de un
    `mark_email_outbox_sent` que nunca cuajó) o simplemente un intento nuevo
    que aún no logra hablar con Resend. Ninguna de las dos avanza hacia
    `failed` -- ver la sección "Garantías D16/A10" más abajo. Es la misma
    situación que `transientFailed` en los logs estructurados -- si el
    contador sigue positivo corrida tras corrida, es un incidente de Resend
    o de red, no un bug de esta fila.
  - `attempt_count` estático, `created_at` de más de 20 horas y `status`
    todavía `processing`. El worker DEJÓ deliberadamente de reclamar esta
    fila para no reenviarla fuera de la ventana de 24h en la que el
    Idempotency-Key de Resend garantiza devolver la respuesta cacheada (ver
    "Garantías D16/A10" -- la fila nunca fue marcada `failed`, pero tampoco
    se le sigue insistiendo). Requiere intervención manual: buscar el
    mensaje en el dashboard de Resend por destinatario/asunto/fecha para
    confirmar si se entregó, y decidir a mano si reencolar (nueva fila, con
    un `idempotency_key` nuevo) o dar por resuelta.

## Inspeccionar filas concretas

```sql
select id, store_id, template_kind, recipient_email, status, attempt_count,
       rejection_count, claim_generation, last_error_code, last_error,
       created_at, updated_at
from ecommerce.email_outbox
where status = 'failed'
order by updated_at desc
limit 50;
```

## Logs estructurados

El worker emite una línea JSON por invocación, en una de dos formas según si
pudo reclamar un lote o no:

- **Corrida normal** (con o sin filas que procesar): status HTTP 200,
  `{"level":"info","msg":"email-outbox-worker batch complete","ok":true,"claimed":N,"sent":N,"failed":N,"markSentFailed":N,"transientFailed":N,"staleWrites":N}`.
  `markSentFailed` cuenta las filas que Resend SÍ entregó (`sendEmail`
  devolvió `ok:true`) pero cuya llamada a `mark_email_outbox_sent` falló --
  la fila queda `processing`, su lease expira, y el siguiente tick vuelve a
  reclamarla y reintenta la marca (D16). Es autocurable, y esa fila NUNCA
  debe terminar en `failed` por esto (`markFailed` nunca se llama en este
  caso -- ver `lib/email/outbox-worker.ts`). Un `markSentFailed` puntual, en
  una sola corrida, no requiere acción. Si el contador sigue en positivo
  corrida tras corrida -- sobre todo si son los mismos `id` repitiéndose en
  las líneas `mark_email_outbox_sent failed` de abajo -- ya no es una falla
  transitoria: revisar el grant de `ecommerce.mark_email_outbox_sent` a
  `service_role` (D14) y el estado de la base antes de asumir que se va a
  resolver solo.
  `transientFailed` cuenta las filas cuyo envío (o REENVÍO -- ver la
  sección "Garantías D16/A10" abajo) falló de forma transitoria
  (`lib/email/resend-client.ts`'s `retryable`: cualquier 5xx, `rate_limit_
  exceeded`, `concurrent_idempotent_requests`, o un fallo de red que ni
  siquiera llegó a Resend). Igual que `markSentFailed`, es autocurable por
  el mismo mecanismo de lease -- esa fila NUNCA debe terminar en `failed`
  por esto tampoco (`markFailed` no se llama; se llama `mark_email_outbox_
  transient_failure`, que solo registra `last_error`/`last_error_code` sin
  tocar `status` ni `rejection_count`). Un `transientFailed` puntual no
  requiere acción; si sigue positivo corrida tras corrida es un incidente
  de disponibilidad de Resend (o de red), no un bug de esta fila -- revisar
  `email_outbox_health.transient_failures` para ver cuántas filas están en
  ese estado en total.
  `staleWrites` cuenta las llamadas a `mark_email_outbox_sent` /
  `mark_email_outbox_failed` / `mark_email_outbox_transient_failure` cuya
  RPC corrió bien pero cuyo `claim_generation` ya no era el vigente -- una
  reclamación más reciente (de este mismo worker en un tick posterior, o de
  otro) ya le ganó la fila. La escritura se rechaza correctamente (ver
  "Garantías D16/A10" abajo); no es un error para reintentar (el trabajo que
  describía ya es nulo), pero tampoco cuenta como `sent`/`failed`/
  `transientFailed` -- nada de eso ocurrió de verdad. Un `staleWrites`
  puntual no requiere acción (es la concurrencia funcionando como debe). Si
  el contador es sostenidamente positivo -- sobre todo con los mismos `id`
  repitiéndose en las líneas `... stale: claim_generation no longer
  current` de abajo -- es la señal de que el lease de 2 minutos se está
  quedando corto para la latencia real de Resend: considerar subir la
  duración del lease en `claim_email_outbox_batch`
  (`20260806000400_ecommerce_email_outbox_transient_retry.sql`) o investigar
  por qué Resend está respondiendo tan lento.
- **Claim roto** (la corrida entera falla): status HTTP 500,
  `{"level":"error","msg":"email-outbox-worker batch failed","ok":false,"reason":"claim_failed","error":"..."}`.
  Significa que `claim_email_outbox_batch` en sí falló -- un grant revocado,
  una firma cambiada, un lock que no cede -- no que la cola esté vacía. Antes
  de esta corrección un claim roto se veía IDÉNTICO a una cola vacía
  (`{"claimed":0,"sent":0,"failed":0}`, HTTP 200) en cada uno de los 1440
  ticks diarios; un 500 con `"reason":"claim_failed"` es justamente el caso
  que dejó de esconderse. El campo `error` trae el mensaje de Postgres tal
  cual. `net.http_post` (el mecanismo del cron, ver
  `20260805000400_ecommerce_email_worker_provisioning.sql`) también registra
  el status_code de cada invocación en `net._http_response` -- útil si los
  logs de Edge Functions ya rotaron:
  ```sql
  select id, status_code, content, error_msg, created
  from net._http_response
  order by created desc
  limit 10;
  ```

Además de estas dos líneas por invocación, cada RPC individual que falla dentro
de una corrida deja su propia línea de error (`claim_email_outbox_batch` /
`mark_email_outbox_sent` / `mark_email_outbox_failed` /
`mark_email_outbox_transient_failure`), con el `id` de la fila cuando aplica.
Todo se lee desde el dashboard de Supabase → Edge Functions → `email-worker`
→ Logs, o vía `supabase functions logs email-worker` con el proyecto
enlazado.

## Garantías D16/A10: un correo que Resend aceptó nunca termina `failed`

### Parte 1 -- ruido transitorio en el REENVÍO (un solo llamador)

Un verificador reprodujo, contra Postgres real, que la fila que deja un
`mark_email_outbox_sent` fallido (Resend YA entregó el correo, pero la marca
de "enviado" no cuajó -- ver `markSentFailed` arriba) podía terminar
`failed` si los REENVÍOS que la reclamaban por lease vencido fallaban de
forma transitoria (un 5xx de Resend, `rate_limit_exceeded`, un corte de
red) tres veces seguidas: `claim_email_outbox_batch` subía `attempt_count`
en cada reclamo sin importar la razón, y `mark_email_outbox_failed` leía
esa misma columna para decidir cuándo terminar la fila -- cuatro reclamos,
sin importar cuántos eran ruido transitorio, se leían como cuatro intentos
genuinos.

Confirmado contra la documentación oficial de Resend
(resend.com/docs/dashboard/emails/idempotency-keys, sección "How it
works"): reenviar la MISMA `Idempotency-Key` de un envío que ya tuvo éxito
devuelve esa MISMA respuesta cacheada -- Resend nunca vuelve a evaluar el
payload en un reenvío, así que un reenvío jamás puede volver como un
rechazo nuevo de un mensaje que ya aceptó, MIENTRAS esa clave siga
retenida. Los propios docs acotan esa retención a **24 horas** -- pasado
ese punto Resend ya no tiene una respuesta cacheada que devolver, así que
un "reenvío" a esa altura se evalúa como un envío genuinamente nuevo (ver
la Parte 3 abajo). Dentro de esa ventana, un no-2xx en un reenvío solo
puede ser el propio transporte de Resend sin poder responder (`5xx`,
`rate_limit_exceeded`, `concurrent_idempotent_requests` -- su propio caso
documentado de "hay una petición con esta clave en vuelo, reintenta más
tarde") -- cero evidencia sobre el destino del mensaje, en un reenvío o en
un primer intento por igual -- o la palabra autorizada y repetible de
Resend sobre ESE payload exacto (cualquier otro 4xx, incluidos los códigos
de cuota de D18), que un reenvío solo puede repetir, nunca inventar.

**La corrección** (`20260806000400_ecommerce_email_outbox_transient_retry.sql`):

- `lib/email/resend-client.ts` etiqueta cada fallo con `retryable`: cualquier
  5xx, `rate_limit_exceeded` o `concurrent_idempotent_requests` es
  `retryable:true`; cualquier otro 4xx (incluidas las cuotas D18) es
  `retryable:false` -- sin cambios de comportamiento para las cuotas, que
  siguen avanzando la escalera terminal exactamente como antes.
- `lib/email/outbox-worker.ts` bifurca en `retryable`: `false` llama a
  `markFailed` (sin cambios); `true` llama a la nueva
  `markTransientFailure`, que solo registra `last_error`/`last_error_code`
  (visibilidad D36) sin tocar `status` ni la escalera -- la fila queda
  `processing` y su lease vencido es lo que la vuelve a reclamar, reusando
  el mismo mecanismo que ya existía para `markSentFailed`.
- La escalera de cuatro intentos (D16/A10: inmediato, +1 min, +5 min,
  terminal al cuarto) ahora corre sobre su PROPIA columna,
  `rejection_count`, que solo `mark_email_outbox_failed` incrementa --
  nunca un `claim`. `attempt_count` sigue existiendo sin cambios (sigue
  subiendo en cada `claim`, por cualquier razón) y conserva su rol de
  diagnóstico de arriba ("worker no corre" vs. "algo está atascado"); la
  escalera terminal ya no puede leerlo ni ser contaminada por ruido
  transitorio.
- `email_outbox_health` suma una columna `transient_failures`, mismo
  patrón que `quota_failures`, para que este estado sea visible sin tener
  que inspeccionar filas una por una.

### Parte 2 -- la carrera (llamadores concurrentes/tardíos)

Una segunda pasada del verificador reprodujo, dos veces contra Postgres
real (una forzando timestamps en una sola sesión, otra a través de cuatro
conexiones `psql` genuinamente separadas para descartar un artefacto de
transacción única), que la Parte 1 no bastaba: ninguna de las tres
`mark_email_outbox_*` protegía su `UPDATE` contra que quien llama ya no
fuera el dueño de la reclamación VIGENTE. En producción cada llamada RPC es
su propia transacción, confirmada al instante (PostgREST invoca
claim/send/mark por separado -- ninguna transacción de base de datos
abarca claim->send->mark), y `lib/email/outbox-worker.ts` envía por HTTP
plano sin ningún timeout atado al lease de 2 minutos. Entonces: el worker A
reclama (su envío a Resend tarda más que su lease -- una degradación de
Resend por sí sola puede causarlo) -> el worker B reclama la misma fila y
la marca `sent` con un `provider_message_id` real -> la respuesta TARDÍA
de A finalmente resuelve y llama a `mark_email_outbox_failed` -- sin nada
que lo impidiera, eso devolvía una fila YA entregada hacia `failed`. El
mismo hueco dejaba que un `mark_email_outbox_transient_failure` tardío
estampara un `last_error_code` falso sobre una fila ya `sent`,
envenenando en silencio la señal D36 de esa fila.

**La corrección:** un token de fencing monótono, `claim_generation`, que
`claim_email_outbox_batch` acuña en cada reclamo (fresco, reintento
programado o reclamo por lease vencida) y que las tres `mark_email_outbox_*`
exigen de vuelta, aplicando su escritura solo si todavía coincide con el
valor VIGENTE de la fila. Se eligió sobre la otra opción evaluada
(`WHERE ... AND locked_by = p_worker_id`) porque `WORKER_ID`
(`supabase/functions/email-worker/index.ts`) se genera una vez por
ISOLATE de Deno, no por invocación -- un isolate de edge-runtime se
mantiene caliente a través de muchos ticks de cron, así que el MISMO
worker puede legítimamente reclamar su propia fila abandonada en un tick
posterior. `locked_by = p_worker_id` habría dejado pasar la respuesta
tardía de ESE mismo worker (un problema ABA: misma identidad, reclamo
distinto). Un contador estrictamente creciente no tiene esa colisión.

Una escritura tardía rechazada no es un error para reintentar (el trabajo
que describe ya es nulo -- quien tiene la generación VIGENTE ya resolvió
la fila, o lo hará), pero tampoco debe desaparecer (D36): las tres
`mark_email_outbox_*` ahora devuelven `boolean` (`true` = aplicada,
`false` = rechazada por fencing) en vez de `void`/error, y
`lib/email/outbox-worker.ts` convierte un `false` en el contador
`staleWrites` (ver "Logs estructurados" arriba) en vez de contarlo como
`sent`/`failed`/`transientFailed`.

Verificado manualmente además con 5 conexiones `psql` genuinamente
separadas reproduciendo la secuencia completa (claim A, expirar lease,
claim B, `mark_email_outbox_sent` de B, `mark_email_outbox_failed` tardío
de A) -- la fila terminó `sent`, con el `provider_message_id` real de B,
`rejection_count = 0` y `last_error_code` intacto.

### Parte 3 -- alcance honesto: la ventana de 24 horas de Resend

Toda la Parte 1 (que un no-2xx en un reenvío no es evidencia de rechazo)
depende de la retención de 24 horas de Resend para el Idempotency-Key.
Una versión anterior de este archivo y de los comentarios de la migración
afirmaban la garantía "nunca `failed`" sin acotarla -- cierto del CÓDIGO
(`mark_email_outbox_failed` sigue sin llamarse jamás ante un fallo
retryable, para siempre), pero exagerado como historia de seguridad una
vez que la suposición de la que depende deja de sostenerse: pasadas 24
horas, un "reenvío" ya no tiene garantizado devolver la respuesta cacheada
-- Resend puede procesarlo como un envío genuinamente nuevo, arriesgando
una SEGUNDA entrega de un correo que ya salió una vez (la garantía D1
original, no esta).

`claim_email_outbox_batch` ahora deja de reclamar (y por lo tanto de
reenviar contra Resend) una fila `processing` ambigua una vez que lleva 20
horas sin resolverse -- 4 horas de margen bajo el límite de 24. Esa fila
NUNCA se marca `failed` (esa garantía sigue siendo incondicional) pero
tampoco se le sigue insistiendo pasado el punto donde hacerlo es seguro:
simplemente deja de ser reclamada, quedando visible vía
`email_outbox_health` y el diagnóstico de "processing con filas viejas"
de arriba para que un operador la resuelva a mano -- la misma postura de
observabilidad v1 (D36) que cualquier otro caso de fila atascada en este
archivo, no una automatización nueva.

La prueba de que la fila del ejemplo NUNCA termina `failed` (que una fila
genuinamente rechazada SÍ sigue terminando exactamente al cuarto intento
sin que el ruido transitorio la adelante ni la retrase, y que una
escritura tardía/con `claim_generation` superada se rechaza sin corromper
una fila ya resuelta) es transaccional y vive en
`supabase/checks/verify-email-platform-contract.sql` -- la capa de Vitest
mockea `claimBatch`/`sendEmail`/`markSent`/`markFailed`/
`markTransientFailure` por completo y no puede probar ninguna de estas
garantías.

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
archivo real. Solo necesita el binario `deno` -- corre en CI sin Docker.

El nombre del comando (`-boot`) sobreclama lo que en realidad prueba: es un
chequeo de **resolución**, no de arranque ni de ejecución -- se mantiene ese
nombre porque así lo referencia esta rama, pero tanto el propio script como
esta sección lo dejan explícito. Lo que NO prueba: que la function arranca
dentro del edge-runtime real, y ni siquiera arrancar prueba que un código
concreto (como el JSX de `lib/email/render.tsx`) se haya ejecutado alguna
vez -- una petición que devuelve 401 por firma inválida o 500 por falta de
secreto también "arranca" la function sin llegar jamás al render. Esa
distinción no era teórica: se activó en staging (ver la sección siguiente).
`pnpm supabase:verify:functions-render` (abajo) es lo único que cierra esa
brecha.

```sh
pnpm supabase:verify:functions-boot
supabase functions serve --no-verify-jwt &
curl -i -X POST http://127.0.0.1:54321/functions/v1/email-worker -H "Authorization: Bearer <EMAIL_WORKER_CRON_SECRET local>"
curl -i -X POST http://127.0.0.1:54321/functions/v1/auth-email-hook
```

## deno.json por función (no uno compartido) -- el fallo real de staging

La activación en vivo de `plan-correos-ecommerce` reveló que `auth-email-hook`
en staging respondía 500 a toda invocación real de GoTrue (signup y
recuperación de contraseña rotos) con
`{"error":"ReferenceError: React is not defined"}`: el JSX de
`lib/email/render.tsx` se estaba compilando al runtime CLÁSICO
(`React.createElement(...)`, que necesita `React` en scope) en vez del
automático (`react/jsx-runtime`), pese a que `supabase/functions/deno.json`
(un único archivo compartido en la raíz de `functions/`) ya declaraba
`jsx: "react-jsx"` / `jsxImportSource: "react"` correctamente.

Causa raíz, confirmada contra el código fuente del CLI
(`ShouldUseDenoJsonDiscovery` en `pkg/function/bundle.go`) y contra la
documentación oficial de Supabase: el CLI (v2.95.3+) solo auto-descubre un
`deno.json` que esté en el MISMO DIRECTORIO que el entrypoint de la
function. Un `deno.json` compartido en la raíz de `supabase/functions/` NO
califica -- el deploy cae a un import map "fallback" (por eso el log de
deploy mostraba `WARNING: Functions using fallback import map`), que
descarta las `compilerOptions` y deja el JSX en modo clásico. Esto además
afectaba a `email-worker`, que no declaraba ningún `import_map` propio en
`config.toml` y por tanto también caía al mismo fallback (aunque ese
function no usa JSX, así que el síntoma ahí era silencioso). El flag
`import_map` de `config.toml` apuntando a un `import_map.json` suelto
(en vez de un `deno.json`) tampoco calificaba, y además el CLI ya reporta
ese flag como no soportado: `Specifying import_map through flags is no
longer supported. Please use deno.json instead.`

Corregido moviendo la configuración a un `deno.json` propio por function
(estructura recomendada por Supabase):

```
supabase/functions/auth-email-hook/deno.json   -- jsx/jsxImportSource + imports (react, @react-email/*)
supabase/functions/email-worker/deno.json      -- {} (no usa JSX; existe solo para no caer al mismo fallback)
```

y declarando `import_map = "./functions/<slug>/deno.json"` explícitamente
en `config.toml` para cada function (mismo patrón que genera `supabase
functions new`), en vez de dejarlo implícito. Ya no existe ningún
`supabase/functions/deno.json` ni `import_map.json` compartido -- la propia
documentación de Supabase advierte que un `deno.json` global en
`/supabase/functions` "es posible para desarrollo local pero no se
recomienda para despliegue".

### `pnpm supabase:verify:functions-render`

`scripts/check-edge-functions-render.mjs` es la prueba de que lo de arriba
funciona de verdad: arranca `supabase functions serve` (Docker) con un
secreto propio y desechable, siembra una tienda + `auth_intents` temporales,
firma una petición Standard Webhooks real y la envía a `auth-email-hook` --
la primera vez que algo en este repo lleva una petición hasta
`renderEmail()` bajo un runtime real. Si la respuesta es 200, confirma
además que la fila que cayó en `ecommerce.email_outbox` tiene `html_body`/
`text_body` no vacíos, y limpia todo lo que sembró.

Se descartó deliberadamente la alternativa de un script `deno run` puro (sin
Docker): reproduce el `ReferenceError` original perfectamente contra la
configuración vieja (confirmado a mano, mismo texto exacto que el log de
staging), pero es una vía de resolución de dependencias distinta a la que
usa `supabase functions deploy`/`serve` -- lo único que prueba fielmente
"esto es lo que va a pasar de verdad" es ir por el edge-runtime real. Es más
lento y necesita Docker, pero es lo único que alguna vez probó que un correo
renderizado sale de esta function.

Qué prueba: que con el contenido actual de
`supabase/functions/auth-email-hook/deno.json`, una petición firmada real
llega hasta `renderEmail()` bajo el edge-runtime real y produce HTML/texto
no vacíos que caen en `email_outbox`. Qué NO prueba: que `supabase
functions deploy` vaya a elegir este `deno.json` exacto al desplegar (esa es
la regla de resolución de arriba, un problema distinto de si el render
funciona una vez que el config SÍ se aplica) -- ni que el edge-runtime del
proyecto real se comporte idéntico al que empaqueta el Docker de esta
máquina.

#### `react`/`react-dom` no coincidían bajo Deno -- segundo defecto, ya corregido

Este chequeo quedó en ROJO la primera vez que se corrigió la regla de
resolución de arriba, por un defecto DISTINTO al `ReferenceError` original.
`@react-email/render` (2.1.0, y la copia interna 2.0.6 que trae
`@react-email/components@1.0.12`) declara `react-dom` como
`peerDependencies` (`^18.0 || ^19.0 || ^19.0.0-rc`). Aunque
`auth-email-hook/deno.json` fijaba `react-dom` en `19.2.1` -- la misma
versión exacta que `react` --, esa entrada nunca se activaba: nada bajo
`lib/email/` importa el especificador `"react-dom"` a secas (solo `"react"`
y `"@react-email/*"`), así que Deno nunca caminaba esa entrada del import
map y resolvía el `react-dom` del peer de forma independiente -- a veces
quedándose con lo más nuevo que satisface el rango (`19.2.8`, un patch
distinto al `19.2.1` fijado), y a veces no (ver más abajo).
`react-dom` valida en tiempo de ejecución
(`ensureCorrectIsomorphicReactVersion`) que su propia versión coincida
EXACTO con la de `react`; cuando no coincidían, lanzaba `Error: Incompatible
React versions` en cada intento de render.

**Riesgo de deriva con el tiempo, no aleatoriedad de una corrida a otra.**
Sin un `deno.lock` fijado, cada arranque en frío resuelve `react-dom`
contra el estado del registro de npm en ese momento: puede deduplicar a un
único `react@19.2.1` compartido (fuerza el choque con `react-dom`), o
resolver dos copias independientes de `react` que casualmente quedan
autoconsistentes (`react@19.2.8`/`react-dom@19.2.8` juntos, sin cruzarse con
nuestro `react@19.2.1`). Un verificador independiente corrió 14 arranques en
frío consecutivos sin `deno.lock` intentando reproducir un cambio de
resultado entre corridas y no lo logró: las 14 resolvieron exactamente
igual -- para una misma foto del registro de npm, la resolución ES
determinista. El riesgo real no es azar dentro de la misma sesión, sino
deriva hacia adelante: sin `deno.lock`, nada impide que un futuro publish de
npm de un patch de `react`/`react-dom` que siga cayendo dentro del rango
resuelto cambie ese resultado en un build posterior, en silencio -- eso, y
no la variación instantánea, es el "silencioso en un build futuro" que hace
que esto no sea aceptable tal cual. Confirmado a mano en un extremo: con un
`deno.lock` viejo fijado a la resolución incorrecta, falla 100% de las
veces (determinista, pero hacia el resultado equivocado). La pieza que de
verdad carga el peso de evitar la deriva es el `deno.lock` que se commitea
(abajo) -- fija la resolución exacta de forma permanente --, no la sola
presencia del archivo `overrides`: ese archivo declara la intención (fuerza
`react`/`react-dom` a `19.2.1` frente al resolver), pero sin un lockfile
committeado esa intención se re-evalúa contra el registro en cada arranque
en frío en vez de quedar fijada.

**La corrección:** un `package.json` junto al `deno.json`
(`supabase/functions/auth-email-hook/package.json`) con:

```json
{ "overrides": { "react": "19.2.1", "react-dom": "19.2.1" } }
```

**El invariante que fija este `overrides`: Deno debe resolver exactamente
el mismo par `react`/`react-dom` que ya usa el lado Node** (`package.json`
raíz los fija ambos, exactos, en `19.2.1`) -- `lib/email/` es un único
conjunto de módulos compartido entre los dos runtimes y debe comportarse
igual en ambos. No "simplificar" quitando este `overrides` ni aflojando la
versión: sin él, `react-dom` vuelve a resolverse por su cuenta y el defecto
reaparece, con el riesgo de deriva descrito arriba.

`overrides` es el mecanismo que Deno documenta para forzar la versión de una
dependencia transitiva/peer en todo el grafo (`peerDependencies` solo se lee
de un `package.json`, nunca de `deno.json` -- confirmado contra la
documentación oficial de Deno). Confirmado que SÍ fuerza la resolución
correcta incluso dentro del edge-runtime real (que no monta el
`node_modules` de la raíz del repo, así que no hay forma de que esté
"haciendo trampa" reusando la resolución ya consistente del lado Next.js):
`docker exec` contra el contenedro después de un render exitoso muestra
`react-dom@19.2.1_react@19.2.1` en el lockfile resultante, nunca ya
`19.2.8` emparejado con `19.2.1`.

**El `deno.lock` resultante SÍ se fija en el repo** (para que un build en
frío no pueda volver a resolver distinto), pero recortado a mano: `deno
install` (el único comando que de verdad escribe un lockfile cuando hay un
`package.json` de por medio -- `deno info`/`deno cache` no escriben ninguno
en ese caso) agrega una sección `"workspace"` de nivel superior con el
`overrides` embebido, en un formato de lockfile que el edge-runtime real
(`supabase-edge-runtime-1.73.13`, compatible con Deno v2.1.4 -- una versión
de Deno MÁS VIEJA que el `deno` 2.9.3 de esta máquina) no sabe parsear:
`Failed deserializing. Lockfile may be corrupt: Invalid workspace section:
missing field 'dependencies'` -- un `503 BOOT_ERROR` determinista, peor que
el defecto original. Regenerar así si algún día hace falta:

```sh
cd supabase/functions/auth-email-hook
rm -f deno.lock
deno install --node-modules-dir=none --lockfile-only
python3 -c "
import json
d = json.load(open('deno.lock'))
d.pop('workspace', None)
json.dump(d, open('deno.lock', 'w'), indent=2)
"
```

y confirmar que `react-dom@19.2.1_react@19.2.1` (no `19.2.8`) aparece bajo
`npm` en el resultado antes de commitear. `--node-modules-dir=none` evita
que `deno install` además cree una carpeta `node_modules/` ahí (no se
commitea; sería ruido generado, igual que en el resto del repo).

`email-worker` no necesita nada de esto: su único import externo es `npm:
@supabase/supabase-js@2` (confirmado contra su `deno.lock` -- ningún
`react`/`react-dom`/`@react-email/*` en su grafo de dependencias), así que
nunca toca este peer dependency.

Confirmado con 3 corridas consecutivas en frío (`docker stop`+`rm` tanto del
contenedor de Studio como del de edge-runtime antes de cada una -- Studio
también monta el mismo volumen con caché de Deno, así que un `docker volume
rm` con Studio todavía corriendo falla en silencio sin limpiar nada de
verdad; ver el comentario en `scripts/check-edge-functions-render.mjs` si
hace falta repetir esto) que `pnpm supabase:verify:functions-render` pasa
de punta a punta.

No afecta el lado Node/Next.js (`app/api/email-preview`,
`lib/checkout/order-notifications.ts`,
`lib/auth/platform-identity-invites.ts`,
`app/admin/actions/store-identity.ts`): ahí `react`/`react-dom` ya estaban
fijados exactos a `19.2.1` en `package.json`/`pnpm-lock.yaml`, sin ninguna
resolución npm por peer-dependency de por medio -- este defecto era
exclusivo del lado Deno de `auth-email-hook`.

```sh
pnpm supabase:verify:functions-render
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

**D24, en ambas ramas:** un fallo del propio limitador (`ecommerce.check_
and_record_send_attempt`, D25) -- no el límite alcanzado, sino la
comprobación en sí fallando (lock timeout, un grant roto) -- nunca debe
leerse distinto de un rate-limit genuino para quien ve la respuesta. La
rama D20 lo distingue en TS (`ensureInviteSendAllowed` en `lib/auth/
platform-identity-invites.ts`, ya que llama la RPC directamente); la rama
D21 lo distingue DENTRO de `ecommerce.request_membership_invite`
(`20260806000500_ecommerce_membership_invite_limiter_failure.sql`), que
aísla esa llamada interna en su propio bloque para devolver
`rate_limit_check_failed` en vez de dejar que el error entero se propague
como un mensaje genérico distinto. Ambas ramas terminan en el mismo
outcome (`rate_limit_check_failed`), mapeado en `lib/supabase/stores-
admin-api.ts` y `lib/supabase/memberships-api.ts` al MISMO texto en
español que un rate-limit real -- la única forma de distinguirlos es el
log estructurado que cada rama emite (`console.error` en
`lib/auth/platform-identity-invites.ts`, con `storeId`/`purpose` o
`storeId`/`intendedUserId` según la rama).

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
