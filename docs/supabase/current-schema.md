# Estado actual del esquema Supabase (diagnóstico)

Este documento resume el **estado observado en el repositorio** entre scripts SQL versionados y el consumo real desde la app.

## Esquema base versionado (public)

### Evidencia SQL revisada

- `scripts/inicializar-base-datos.sql` define el orden de inicialización y valida objetos en `table_schema = 'public'`.
- `scripts/30-create-stores-table.sql` crea `public.stores`, `public.store_users` y funciones `get_store_by_subdomain`, `user_has_store_access`.
- `scripts/20-create-products-tables.sql` crea `public.item_categories`, `public.store_items`, `public.item_variants`, `public.item_images`, `public.item_options`.
- `scripts/29-create-orders-tables.sql` crea `public.orders`, `public.order_items`, y funciones/triggers de numeración de pedidos.
- `scripts/19-create-user-profiles-table.sql` crea `public.user_profiles` y trigger `public.handle_new_user`.
- `scripts/01-create-component-styles-table.sql` crea `public.component_styles`.
- `scripts/01-create-themes-table.sql` y `scripts/04-create-fonts-table.sql` crean `app_themes` y `app_fonts` (sin prefijo explícito de schema, con validaciones/migraciones posteriores asumiendo `public`, por ejemplo en `scripts/33-add-store-id-to-styles.sql`).

### Tablas base identificadas en scripts

- `public.user_profiles`
- `public.stores`
- `public.store_users`
- `public.item_categories`
- `public.store_items`
- `public.item_variants`
- `public.item_images`
- `public.item_options`
- `public.orders`
- `public.order_items`
- `public.component_styles`
- `public.app_themes` / `public.app_fonts` (efectivamente tratadas como `public` en scripts de verificación/migración)

### Objetos runtime definidos en scripts

- Funciones: `get_store_by_subdomain`, `user_has_store_access`, `generate_order_number`, `set_order_number`, `handle_new_user`, y funciones auxiliares de `updated_at`.
- Triggers asociados para `stores`, `store_users`, `orders`, `order_items`, `user_profiles`, `store_items`, etc.

## Capa de compatibilidad requerida por la app

### Evidencia en código de aplicación

- La app opera datos de negocio con `schema("ecommerce")`:
  - `lib/supabase/client.ts`
  - `lib/supabase/store-api.ts`
- La resolución de tienda usa `stores_legacy` (esperado dentro de `ecommerce`):
  - `proxy.ts` (REST con header `Accept-Profile: ecommerce` a `/rest/v1/stores_legacy`)
  - `app/api/store/route.ts`
  - `lib/supabase/store-api.ts`
  - `lib/supabase/themes-api.ts`
  - `lib/supabase/products-api.ts`
  - `lib/supabase/styles-api.ts`
  - `lib/supabase/chatbot-api.ts`
- Temas activos por tienda: la app consulta/actualiza `app_theme_versions`:
  - `lib/supabase/themes-api.ts`
- Métricas de vistas de producto: la app invoca RPC `increment_item_views` y, si falla, usa `item_metrics`:
  - `lib/supabase/products-api.ts`
- La app también consume otros objetos legacy/runtime no versionados en SQL:
  - `orders_legacy`: `lib/supabase/stats-api.ts`, `lib/supabase/orders-api.ts`
  - `component_styles_legacy`: `lib/supabase/styles-api.ts`
  - `app_fonts_legacy`: `lib/supabase/fonts-api.ts`
  - `item_options_legacy`: `lib/supabase/products-api.ts`

### Objetos de compatibilidad que la app da por existentes

- Schema lógico: `ecommerce`
- Vista/tabla de lectura legacy: `stores_legacy`
- Vista/tabla de pedidos legacy: `orders_legacy`
- Vista/tabla de estilos legacy: `component_styles_legacy`
- Vista/tabla de fuentes legacy: `app_fonts_legacy`
- Vista/tabla de opciones legacy: `item_options_legacy`
- Tabla de versionado de tema activo: `app_theme_versions`
- RPC para vistas: `increment_item_views`
- Tabla fallback de métricas: `item_metrics`

## Desalineaciones y gaps conocidos

1. **Desalineación principal de schema**
   - Scripts versionados crean/validan mayormente `public.*`.
   - La app consulta mediante `schema ecommerce` (`client.schema("ecommerce")` y `Accept-Profile: ecommerce`).
   - Resultado: riesgo alto de que objetos creados por scripts no sean visibles donde la app los busca.

2. **`stores_legacy` requerido por runtime, no versionado en scripts**
   - Se consume en múltiples puntos de app/proxy.
   - En `scripts/*.sql` no aparece definición versionada de vista/tabla `stores_legacy`.

3. **Dependencia runtime en `*_legacy` no versionada en SQL**
   - Además de `stores_legacy`, la app consume `orders_legacy`, `component_styles_legacy`, `app_fonts_legacy` e `item_options_legacy`.
   - No hay scripts versionados que creen esas vistas/tablas de compatibilidad.

4. **`app_theme_versions` requerido por runtime, no versionado en scripts**
   - Usado para activar tema por tienda en `lib/supabase/themes-api.ts`.
   - No hay script que cree o migre explícitamente `app_theme_versions`.

5. **RPC `increment_item_views` requerida por runtime, no versionada en scripts**
   - La app llama `supabase.rpc('increment_item_views', ...)` y cae en fallback `item_metrics`.
   - No hay definición SQL versionada para `increment_item_views` ni para `item_metrics`.

6. **`user_profiles.role` se usa en código/policies, pero no existe en el script base de creación**
   - `scripts/19-create-user-profiles-table.sql` crea `public.user_profiles` con `id`, `email`, `first_name`, `last_name`, timestamps, pero sin columna `role`.
   - Sin embargo, `scripts/30-create-stores-table.sql` y `scripts/27-setup-storage-bucket.sql` consultan `public.user_profiles.role = 'admin'`.

7. **Persisten constraints globales que chocan con expectativas multi-tenant después de agregar `store_id`**
   - En scripts base siguen existiendo unicidades globales como `item_categories.category_name`, `store_items.item_code`, `store_items.item_slug`, `orders.order_number`, `component_styles.component_name`, `app_themes.theme_name`, `app_fonts.font_name` y `user_profiles.email`.
   - Después de `scripts/31-add-store-id-to-products.sql`, `scripts/32-add-store-id-to-orders.sql` y `scripts/33-add-store-id-to-styles.sql`, varias entidades pasan a ser por tienda, pero no todas las restricciones fueron adaptadas al nuevo modelo multi-tenant (por ejemplo, solo `component_styles` recibe una unicidad compuesta `(component_name, store_id)`).

8. **Scripts opcionales vacíos**
   - `scripts/21-add-user-roles.sql`, `scripts/22-create-cart-tables.sql` y `scripts/00-inicializacion-completa.sql` están vacíos en el repositorio actual.

### Siguientes pasos recomendados (solo documentación/diagnóstico)

- Documentar en un inventario único por objeto: **dónde vive realmente** (`public` vs `ecommerce`), quién lo consume y evidencia (archivo + referencia).
- Agregar una matriz de trazabilidad `scripts/*.sql` ↔ objetos esperados por runtime (`stores_legacy`, `app_theme_versions`, `increment_item_views`, `item_metrics`).
- Registrar explícitamente, en documentación de operación, qué objetos son “base versionada” y cuáles son “compatibilidad requerida por app” para reducir incidentes de despliegue.
- Definir un checklist de verificación de entorno (diagnóstico) previo a deploy que confirme presencia de objetos runtime críticos en el schema esperado.

## Contrato runtime reparado (sin mutaciones DB)

Este lane implementa un **contrato runtime app-side** para tolerar payloads legacy sin tocar datos productivos ni ejecutar SQL:

- Tema canónico en runtime: `{ theme_name, colors }`
  - Alias aceptado de entrada: `theme_config`
  - Consumidores (`bootstrap`, providers, APIs) solo exponen/guardan `colors`.
- Fuente canónica en runtime: `{ font_name, font_family, google_font_url }`
  - Alias aceptado de entrada: `font_url`
  - Consumidores de runtime convierten alias y preservan `google_font_url: null` para fuentes de sistema.
- Resolución de tienda para cachés críticos:
  - `default` se considera placeholder simbólico de UI.
  - Caches store-scoped usan UUID real o `null`; no deben tratar `default` como UUID real.

### Postura de seguridad de DB en este cambio

- No se aplicaron migraciones.
- No se hizo backfill ni reparación de datos.
- No se mutaron objetos `public.*`.
- La corrección es 100% en la capa de aplicación/runtime.

## Contrato de escritura reparado para `component_styles`

- Lectura runtime: se mantiene sobre `ecommerce.component_styles_legacy` desde `lib/supabase/styles-api.ts`.
- Escritura admin: el cliente ya no muta `ecommerce.component_styles` desde el browser.
- Nuevo flujo de guardado:
  - `components/admin/editor-panel.tsx` sigue llamando `updateComponentStyle(...)`.
  - `lib/supabase/styles-api.ts` ahora delega a `POST /api/admin/component-styles`.
  - `app/api/admin/component-styles/route.ts` valida sesión autenticada y rol `admin`.
  - La mutación real se ejecuta server-side con `SUPABASE_SERVICE_ROLE_KEY` sobre `ecommerce.component_styles`.
- Objetivo: reparar el `42501 permission denied for table component_styles` sin ampliar grants ni ejecutar SQL en vivo.
- Alcance: este cambio no toca `public.*`, no cambia RLS/policies y no altera la ruta legacy de lectura.
