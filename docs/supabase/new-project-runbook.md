# Runbook: go-live del ecommerce a un proyecto Supabase free propio

Mover el ecommerce del proyecto Supabase **compartido** a **su propio proyecto free**, con datos frescos, protegido contra la pausa por inactividad, y limpiando después el schema `ecommerce` del compartido.

> **Estado:** parcialmente **parqueado**. Solo el **keep-alive** (paso 6) está implementado y listo para desplegar. El resto (crear proyecto, seed, cutover, limpieza) se ejecuta al final del roadmap, cuando aterricen los planes que aún tocan el schema y se salde la deuda de registro de migraciones (#2339). Ledger completo: engram `oso/plan-golive-supabase-freeplan/ledger` (#2375).

---

## Contexto y reglas duras

- Repo: Next.js 16 + pnpm, deploy en **Vercel**. Rama activa `New-Features`.
- El proyecto compartido `feqsjdhcsrksvrfsjsfv` ("Databases4OsorIA") hospeda **3 apps**: `ecommerce` (nuestro schema), `public` (control de plagas, 33 tablas) y `copaosoria`. **`auth.users` es un pool compartido** por las 3 (copaosoria controla el Site URL y el único trigger).
- **Tocar SOLO el schema `ecommerce`. NUNCA `public` ni `copaosoria`.**
- **NO `supabase db push` contra el compartido** (registro de migraciones desincronizado, #2339). En el **proyecto nuevo y vacío** sí aplica — pero solo tras reconciliar los archivos de migración (paso 0).
- `--linked` **no** necesita Docker.
- Los valores de env (`.env*`) los pone **el operador**; los agentes no pueden leerlos ni escribirlos.

---

## Paso 0 — Reconciliar el registro de migraciones (#2339) · PRERREQUISITO

El compartido tiene migraciones aplicadas **a mano** que no están reflejadas en `supabase/migrations/` ni en `schema_migrations` (p.ej. `shop_config` del Plan 7). Un `db push` a un proyecto nuevo **solo reproduce el schema real si los archivos están completos**. Antes de tocar el proyecto nuevo:

1. Diff entre el schema real del compartido (schema `ecommerce`) y la cadena de migraciones.
2. Crear los archivos de migración que falten para las diferencias aplicadas a mano.
3. Verificar en local: `pnpm supabase:start && supabase db reset && pnpm supabase:verify` en verde.

---

## Paso 1 — Crear la org Free + el proyecto (dashboard)

- Supabase factura **por organización** (una org está en Free o Pro, no se mezcla). Crear una **org nueva en plan Free** dedicada al ecommerce → aísla límites y no compite por el tope de 2 proyectos activos con Databases4OsorIA.
- New project → región cercana (Colombia → `us-east-1`). Guardar el **password de la base**.
- ⚠️ Límites free a vigilar en este workload real: **egress 5 GB/mes** (las imágenes de producto salen por ahí) y **500 MB de base**. La pausa la cubre el keep-alive; estos dos son el techo real hacia Pro.

## Paso 2 — Enlazar el repo al proyecto nuevo

```bash
supabase link --project-ref <REF_NUEVO>
```
Confirmar que `config.toml` expone `ecommerce` en PostgREST (`schemas = ["public","graphql_public","ecommerce"]`) — la migración `20260426000300_ecommerce_postgrest_schema_config.sql` lo configura vía SQL; verificar tras el push que el dashboard (API → Exposed schemas) incluya `ecommerce`.

## Paso 3 — Aplicar el esquema al proyecto nuevo

```bash
supabase db push        # SOLO contra el proyecto NUEVO y vacío
```
Reconstruye schema `ecommerce`, RLS, funciones (`provision_store`, `decrement_inventory`, etc.), triggers y los buckets `products` / `component-images` / `marketing-assets`. Cero datos.

## Paso 4 — Seed: tienda default de café (`scripts/seed-default-store.mjs`)

Script idempotente, **dry-run por defecto** (imprime el plan sin tocar la DB); escribe solo con `--apply --confirm`. Marca "Cumbre Dorada Café" (Huila).
1. Crea usuarios (`auth.admin.createUser`, password temporal impreso una sola vez): superadmin `johnjulin2@gmail.com` (role global `super_admin`) y `default@gmail.com` (role global `user` + `must_change_password`, **owner** de la tienda default por membresía — por Plan 12 no existe rol global `admin`: gestionar una tienda = membresía).
2. `provision_store('default', ...)` → tienda + rol owner + membresía en una transacción; luego la publica (`is_public=true`).
3. Branding / contact / commerce / seo; 2 categorías; 3 cafés de origen (honey/natural/washed) con variantes 250g/454g; combo "Trilogía".
4. Sube las imágenes de café de `public/` al bucket `products` (paths deterministas `{store_id}/seed/…`, upsert) y las cablea a `store_items` / `item_images`.

```bash
pnpm seed:default                                   # dry-run: revisa el plan
node scripts/seed-default-store.mjs --apply --confirm   # aplica (con env del proyecto NUEVO)
```
Correr contra el remoto nuevo (con su `SUPABASE_SERVICE_ROLE_KEY`). Guarda el password temporal que imprime.

## Paso 5 — Reconectar la app (operador pone los valores de env)

En Vercel (Project Settings → Environment Variables) del proyecto nuevo:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` del proyecto nuevo.
- `DEFAULT_STORE_ID` = id de la tienda sembrada (modo multi-tenant sigue activo; es fallback).
- **`CRON_SECRET`** = un valor aleatorio fuerte (protege `/api/keep-alive`; ver paso 6).
- Regenerar tipos: `pnpm supabase:types` (usa `--linked`, sin Docker; esperado sin diff).
- En el dashboard nuevo: **redirect URLs / Site URL** con el dominio de producción y **SMTP** para correos de auth.

## Paso 6 — Keep-alive anti-pausa · ✅ IMPLEMENTADO

Ya en el repo:
- `app/api/keep-alive/route.ts` — lectura mínima a `ecommerce.stores`, protegida con `CRON_SECRET`.
- `vercel.json` → `crons: [{ path: "/api/keep-alive", schedule: "0 6 * * *" }]` (diario 06:00 UTC; Hobby permite máx. 1×/día, suficiente para la ventana de 7 días).

Para activarlo: definir **`CRON_SECRET`** en Vercel (paso 5) y desplegar. Vercel adjunta `Authorization: Bearer <CRON_SECRET>` a las invocaciones de cron; la ruta rechaza (401) cualquier llamada sin el secreto correcto.

Prueba manual:
```bash
curl -i https://<tu-dominio>/api/keep-alive                                   # 401 (sin secreto)
curl -i -H "Authorization: Bearer <CRON_SECRET>" https://<tu-dominio>/api/keep-alive  # 200 {ok:true}
```

## Paso 7 — Validar el proyecto nuevo

- `verify-ecommerce-contract.sql` contra el proyecto nuevo (fail-closed).
- Storefront real cargando la tienda de café; login del admin; una compra de punta a punta.

## Paso 8 — Limpiar el proyecto compartido (destructivo, al final)

Solo cuando el nuevo esté validado y en producción:
1. **Dump de seguridad único** del schema `ecommerce` del compartido.
2. Pre-check: listar lo que se va a borrar; confirmar que NO toca `public` ni `copaosoria`.
3. `DROP SCHEMA ecommerce CASCADE` en el compartido + borrar los 3 buckets del ecommerce (verificar ownership antes).
4. **No tocar** `public`, `copaosoria` ni el `auth.users` compartido.
5. Verificar que las otras 2 apps siguen vivas.

El SQL guardado vive en `scripts/cleanup-old-shared-project.sql` (se crea junto con el resto de S3 cuando se retome el go-live).
