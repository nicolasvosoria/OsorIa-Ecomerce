# Plan de migración Supabase — OsorIA Ecommerce

## Decisión base

El ecommerce vive exclusivamente en `ecommerce`. `public` pertenece a otro proyecto/productivo y queda fuera del alcance.

## Fuente de verdad

La fuente de verdad operativa es el contrato runtime del código, validado contra metadata de Supabase. No se debe copiar ciegamente el remoto porque contiene buckets/policies/migraciones de otros proyectos.

## Artefactos

- `supabase/migrations/20260425000100_ecommerce_baseline.sql` — baseline limpia para proyectos nuevos.
- `supabase/migrations/20260425000200_ecommerce_storage.sql` — buckets/policies ecommerce-only.
- `supabase/migrations/20260425000300_ecommerce_runtime_compat_patch.sql` — patch idempotente para un `ecommerce` existente.
- `supabase/checks/verify-ecommerce-contract.sql` — verificación fail-closed.
- `supabase/seed.sql` — seed mínimo, sin producción.
- `lib/supabase/database.types.ts` — tipos generados desde el schema local validado.
- `lib/supabase/contract.ts` — nombres canónicos tipados para schema, tablas, views, RPCs y buckets.

## Flujo local esperado

El CLI queda instalado como dependencia de desarrollo (`supabase@2.95.3`) y aprobado explícitamente para ejecutar su postinstall mediante `pnpm.onlyBuiltDependencies`.

Comandos:

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:verify
pnpm supabase:types
```

Requisito: Docker debe estar instalado y corriendo. En este entorno el CLI funciona, pero Docker no está disponible todavía.

`pnpm supabase:types` regenera `lib/supabase/database.types.ts` desde el schema local `ecommerce` validado. Si la sesión todavía no heredó el grupo `docker`, usar:

```bash
sg docker -c 'pnpm supabase:types'
```

El archivo `supabase/config.toml` expone `ecommerce` en PostgREST local:

```toml
[api]
schemas = ["public", "graphql_public", "ecommerce"]
extra_search_path = ["public", "extensions", "ecommerce"]
```

## Buckets propios

- `products`
- `component-images`
- `marketing-assets`

## Mejoras pendientes

1. Probar migraciones en Supabase local/limpio antes de tocar remoto compartido.
2. Generar tipos Supabase para `ecommerce`.
3. Centralizar nombres de tablas/views/buckets.
4. Continuar refactor de `products-api.ts`: la creación/actualización ya sincroniza SEO, tags e imágenes hacia tablas normalizadas, pero todavía quedan lecturas legacy por migrar incrementalmente.
5. Continuar refactor de `orders-api.ts`: `order_addresses` ya normaliza aliases legacy y `payment_transactions` ya tiene columnas runtime compatibles, pero todavía quedan nombres de tablas por migrar al contrato central.
6. Endurecer RLS cuando el contrato funcional esté estable.
