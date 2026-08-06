-- Convergent checkout follow-ups after the atomic order write (slice 3
-- verifier finding 2).
--
-- lib/supabase/orders-api.ts's createOrder calls the atomic RPC
-- (ecommerce.create_order_with_notifications, 20260805000500) and then runs
-- four follow-ups OUTSIDE that transaction: combo snapshot insert, shipping
-- address insert, payment transaction insert, inventory decrement. If the
-- FIRST attempt dies anywhere between the RPC succeeding and those follow-ups
-- finishing, the customer's natural retry (same checkoutIdempotencyKey,
-- unchanged cart, per app/checkout/page.tsx) makes the RPC return
-- `replayed: true` -- and the old code skipped every follow-up on replay,
-- on the false assumption "they all landed then too". That leaves inventory
-- never decremented (an oversell risk) and the other rows silently missing.
--
-- Required guarantee: after ANY retry sequence, each follow-up has happened
-- exactly once -- never zero times, never twice. This migration makes the
-- inventory decrement idempotent per order via a durable marker set in the
-- SAME transaction as the decrement (a concurrent retry cannot race it,
-- since the claiming UPDATE takes the row lock); the app-code change in the
-- same commit makes the other three idempotent per order via a natural key
-- plus ON CONFLICT DO NOTHING, and now runs all four unconditionally instead
-- of skipping them on replay.
--
-- Scope: ecommerce schema only.

-- -----------------------------------------------------------------------------
-- Inventory decrement: the dangerous one. Not naturally idempotent (a second
-- call would decrement a second time), so it gets a durable marker on the
-- order itself rather than application-level check-then-act.
-- -----------------------------------------------------------------------------
alter table ecommerce.orders
  add column if not exists inventory_decremented_at timestamptz;

comment on column ecommerce.orders.inventory_decremented_at is
  'Set the first (and only) time ecommerce.decrement_inventory actually ran for this order. A retried checkout follow-up claims this atomically (UPDATE ... WHERE inventory_decremented_at IS NULL, in the same transaction as the decrement) and short-circuits with no shortages if it is already set, so a retry can never double-decrement stock.';

create or replace function ecommerce.decrement_inventory(
  p_order_id uuid,
  p_store_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'ecommerce', 'public'
as $$
declare
  v_item jsonb;
  v_variant_id uuid;
  v_product_id uuid;
  v_quantity integer;
  v_track_inventory boolean;
  v_current_quantity integer;
  v_missing jsonb := '[]'::jsonb;
  v_claimed uuid;
begin
  if p_items is null then
    return v_missing;
  end if;

  -- Idempotency claim: the UPDATE and the decrements below run in this
  -- function's own single-statement transaction, so a concurrent retry
  -- claiming the SAME order_id blocks on the row lock until this one
  -- commits, then sees inventory_decremented_at already set -- it can never
  -- both decide "not yet decremented" and both proceed.
  update ecommerce.orders
     set inventory_decremented_at = now()
   where id = p_order_id
     and inventory_decremented_at is null
  returning id into v_claimed;

  if v_claimed is null then
    -- Already decremented for this order by an earlier attempt (or the
    -- order doesn't exist): converged already, nothing left to do.
    return v_missing;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);

    if v_quantity <= 0 then
      continue;
    end if;

    if v_variant_id is not null then
      -- Descuento atómico condicional: si la variante no rastrea inventario,
      -- el WHERE siempre matchea (solo resta, sin bloquear). Si lo rastrea,
      -- solo matchea cuando hay stock suficiente para la cantidad pedida.
      update ecommerce.item_variants
        set inventory_quantity = inventory_quantity - v_quantity
        where id = v_variant_id
          and (track_inventory = false or inventory_quantity >= v_quantity)
      returning track_inventory
        into v_track_inventory;

      if found then
        -- Solo se registra movimiento para decrementos de variante: la
        -- tabla inventory_movements exige variant_id NOT NULL, así que los
        -- decrementos a nivel producto-sin-variante no se pueden loguear
        -- ahí (se omiten más abajo). También evitamos loguear cuando no se
        -- pudo resolver un store_id: eso sería un fallo de una tabla de
        -- auditoría, no debe hacer fallar (ni revertir) el descuento real.
        if v_track_inventory and p_store_id is not null then
          insert into ecommerce.inventory_movements
            (store_id, variant_id, movement_type, quantity, reason, related_order_id)
          values
            (p_store_id, v_variant_id, 'out', -v_quantity, 'order_sale', p_order_id);
        end if;
      else
        select inventory_quantity, track_inventory
          into v_current_quantity, v_track_inventory
          from ecommerce.item_variants
          where id = v_variant_id;

        if found then
          -- El registro existe: por construcción del WHERE de arriba, solo
          -- se llega acá cuando track_inventory = true y no había stock
          -- suficiente. Es un faltante real.
          v_missing := v_missing || jsonb_build_object(
            'variant_id', v_variant_id,
            'product_id', v_product_id,
            'requested', v_quantity,
            'available', coalesce(v_current_quantity, 0)
          );
        end if;
        -- Si la variante no existe en absoluto, se trata como producto
        -- externo/no rastreado (p. ej. remanente de Shopify): no es
        -- faltante, mismo criterio que el resto del código de órdenes.
      end if;

      continue;
    end if;

    if v_product_id is not null then
      -- Sin RETURNING: los decrementos a nivel producto (sin variante) no
      -- registran movimiento en inventory_movements (esa tabla exige
      -- variant_id NOT NULL), así que no hace falta leer inventory_quantity
      -- ni track_inventory acá; FOUND ya refleja si el UPDATE afectó una fila.
      update ecommerce.store_items
        set inventory_quantity = inventory_quantity - v_quantity
        where id = v_product_id
          and (track_inventory = false or inventory_quantity >= v_quantity);

      if not found then
        select inventory_quantity, track_inventory
          into v_current_quantity, v_track_inventory
          from ecommerce.store_items
          where id = v_product_id;

        if found then
          v_missing := v_missing || jsonb_build_object(
            'variant_id', null,
            'product_id', v_product_id,
            'requested', v_quantity,
            'available', coalesce(v_current_quantity, 0)
          );
        end if;
        -- Producto inexistente: externo/no rastreado, no es faltante.
      end if;
    end if;
  end loop;

  return v_missing;
end;
$$;

comment on function ecommerce.decrement_inventory(uuid, uuid, jsonb) is
  'Descuenta inventario de variantes/productos de forma atómica y condicional por item (p_items: [{variant_id, product_id, quantity}]). Idempotente por orden vía ecommerce.orders.inventory_decremented_at: una segunda invocación para el mismo order_id no vuelve a descontar, devuelve faltantes vacío. Devuelve un jsonb con los items sin stock suficiente (faltantes); vacío si todo se descontó (o si ya se había descontado antes). Es la autoridad sobre el stock: la validación previa en la aplicación es solo un pre-chequeo best-effort.';

-- -----------------------------------------------------------------------------
-- Shipping address and payment transaction: naturally idempotent per order
-- with the right natural key, cheaper than a bookkeeping column.
-- -----------------------------------------------------------------------------

-- order_addresses: today's only writer (lib/supabase/orders-api.ts) inserts
-- exactly one 'shipping' row per order at checkout -- (order_id, address_type)
-- is the real domain key ("one address of each type per order"), not a
-- checkout-specific workaround.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_addresses_order_id_address_type_key'
      and conrelid = 'ecommerce.order_addresses'::regclass
  ) then
    alter table ecommerce.order_addresses
      add constraint order_addresses_order_id_address_type_key unique (order_id, address_type);
  end if;
end $$;

-- payment_transactions: unlike order_addresses, this table's own
-- orders_legacy view (`order by created_at desc limit 1`) already expects
-- MORE than one row per order over an order's lifecycle (e.g. a future
-- refund), so order_id alone is not a safe natural key here. The columns
-- that vary per attempt (provider_transaction_id) are nullable and would let
-- Postgres treat every retry as distinct (NULL <> NULL), so they can't be the
-- conflict target either. Instead this reuses the SAME idempotency_key
-- correlator already established for orders/email_outbox (D28/D12): the
-- checkout-time insert carries the order's own idempotency_key, and a plain
-- unique index -- Postgres treats every NULL as distinct, same reasoning as
-- orders_store_id_idempotency_key_key -- constrains only rows this checkout
-- write path sets, never a future writer that leaves it null.
alter table ecommerce.payment_transactions
  add column if not exists idempotency_key text;

comment on column ecommerce.payment_transactions.idempotency_key is
  'D28-style checkout correlation key, set only by the checkout follow-up insert (lib/supabase/orders-api.ts). Null for any row written outside that path. A retried checkout follow-up reusing the same key is ignored (ON CONFLICT DO NOTHING) instead of creating a second row.';

create unique index if not exists payment_transactions_idempotency_key_key
  on ecommerce.payment_transactions (idempotency_key);
