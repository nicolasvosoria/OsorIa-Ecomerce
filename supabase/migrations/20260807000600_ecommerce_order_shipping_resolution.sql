-- D23/D26/A3: how an order's shipping cost was resolved (agreed | rate |
-- free | out_of_zone), stored alongside the amount so a $0 line never means
-- two different things -- and a named check constraint that makes the
-- database itself refuse to store an order whose total doesn't add up.
--
-- D23: shipping_status is nullable for the same reason shipping_location_id
-- already is (20260807000400) -- the live database's one pre-existing order
-- predates this column and has no resolution to record. From here on, every
-- order created through ecommerce.create_order_with_notifications always
-- sets it -- lib/shipping/resolver.ts is the one place that decides the
-- value, threaded through the same way S6 threaded shipping_location_id.
--
-- D26: "the formula stays in ONE place -- TypeScript -- and the database
-- GUARDS it." shipping_cost/tax_amount/discount_amount were nullable
-- columns the app always coalesced to 0 on write (never actually null in
-- practice, per the RPC below); NOT NULL here closes the gap a raw insert
-- could otherwise use to slip past the coherence check -- a CHECK only
-- fails on an explicit false, never on NULL's three-valued "unknown", so a
-- nullable money column would make the guard bypassable rather than
-- guaranteed. subtotal/total_amount are already NOT NULL from the baseline.
--
-- Scope: ecommerce schema only.

begin;

update ecommerce.orders
set shipping_cost = coalesce(shipping_cost, 0),
    tax_amount = coalesce(tax_amount, 0),
    discount_amount = coalesce(discount_amount, 0)
where shipping_cost is null or tax_amount is null or discount_amount is null;

alter table ecommerce.orders
  alter column shipping_cost set default 0,
  alter column shipping_cost set not null,
  alter column tax_amount set default 0,
  alter column tax_amount set not null,
  alter column discount_amount set default 0,
  alter column discount_amount set not null;

alter table ecommerce.orders
  add column if not exists shipping_status text
  constraint orders_shipping_status_chk check (shipping_status in ('agreed', 'rate', 'free', 'out_of_zone'));

comment on column ecommerce.orders.shipping_status is
  'D23: how shipping_cost was arrived at -- agreed (coordinate mode, always 0), rate (a ladder rung above zero), free (a ladder rung of exactly zero), out_of_zone (no zone matched; D7''s allow_with_coordination let it through at 0 anyway, block never reaches an insert at all). Nullable for the same reason shipping_location_id is: only create_order_with_notifications sets it, so orders predating this migration carry none.';

-- D26: non-negativity on every money column -- validated immediately (the
-- default ADD CONSTRAINT behavior). Every write path has always clamped
-- these to >= 0 (Math.max/Math.min in lib/supabase/orders-api.ts's
-- createOrder), so unlike the coherence check below there is no real
-- historical risk of a live row already violating one of these.
--
-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so each is guarded by name
-- against pg_constraint first -- same shape 20260504000100's own "additive
-- integrity" block already uses for this repo's other named CHECK
-- constraints added outside a CREATE TABLE.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_subtotal_nonnegative_chk' and conrelid = 'ecommerce.orders'::regclass) then
    alter table ecommerce.orders add constraint orders_subtotal_nonnegative_chk check (subtotal >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_shipping_cost_nonnegative_chk' and conrelid = 'ecommerce.orders'::regclass) then
    alter table ecommerce.orders add constraint orders_shipping_cost_nonnegative_chk check (shipping_cost >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_tax_amount_nonnegative_chk' and conrelid = 'ecommerce.orders'::regclass) then
    alter table ecommerce.orders add constraint orders_tax_amount_nonnegative_chk check (tax_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_discount_amount_nonnegative_chk' and conrelid = 'ecommerce.orders'::regclass) then
    alter table ecommerce.orders add constraint orders_discount_amount_nonnegative_chk check (discount_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_total_amount_nonnegative_chk' and conrelid = 'ecommerce.orders'::regclass) then
    alter table ecommerce.orders add constraint orders_total_amount_nonnegative_chk check (total_amount >= 0);
  end if;
end $$;

-- D26/A13: the one constraint this whole slice exists for -- the database
-- refusing to store a row whose total doesn't equal its own components, no
-- matter what wrote it. Added NOT VALID on purpose: order totals were
-- client-trusted until commit e67773c (2026-07-12), the store is live and
-- selling right now, and a validated ADD CONSTRAINT scans every existing
-- row at ALTER time -- the first historical mismatch would abort this whole
-- migration with an opaque constraint-violation error on an operator who is
-- not watching. NOT VALID instead enforces the formula on every NEW and
-- UPDATEd row immediately (the guarantee D26 asks for going forward, with
-- zero gap), while validating the rows that already exist is a separate,
-- catchable step right below. Guarded the same way as the non-negativity
-- constraints above -- Postgres has no ADD CONSTRAINT IF NOT EXISTS.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_total_amount_matches_components_chk' and conrelid = 'ecommerce.orders'::regclass
  ) then
    alter table ecommerce.orders
      add constraint orders_total_amount_matches_components_chk
        check (total_amount = subtotal + shipping_cost + tax_amount - discount_amount) not valid;
  end if;
end $$;

-- Validates the constraint against every existing row in this same
-- migration, but from inside a block that can only WARN, never abort: on a
-- mismatch the constraint stays exactly as the statement above left it --
-- in place, already guarding every new write, just still NOT VALID -- and
-- the warning names precisely which orders need correcting instead of
-- leaving the operator with nothing but an aborted migration to go on.
-- Re-running `alter table ecommerce.orders validate constraint
-- orders_total_amount_matches_components_chk;` by hand once those rows are
-- fixed is what finishes the job.
do $$
begin
  alter table ecommerce.orders validate constraint orders_total_amount_matches_components_chk;
exception
  when check_violation then
    raise warning 'orders_total_amount_matches_components_chk could not be validated against all existing rows -- it is already enforced for every NEW and UPDATEd order, but the following historical orders diverge from total_amount = subtotal + shipping_cost + tax_amount - discount_amount and must be corrected, then the constraint validated by hand. Offending order ids: %',
      (
        select string_agg(id::text, ', ')
        from ecommerce.orders
        where total_amount is distinct from (subtotal + shipping_cost + tax_amount - discount_amount)
      );
end $$;

-- create or replace: same shape 20260807000400 already used to thread
-- shipping_location_id and its frozen siblings through this function (same
-- OID, so its `comment on function` from 20260806000300 keeps applying and
-- is not restated here). Only change from the live body: shipping_status
-- now travels through p_order into the insert, grouped with the other
-- shipping_* columns it was born alongside.
create or replace function ecommerce.create_order_with_notifications(
  p_store_id uuid,
  p_idempotency_key text,
  p_payload_fingerprint text,
  p_order jsonb,
  p_items jsonb,
  p_notifications jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_existing ecommerce.orders%rowtype;
  v_order ecommerce.orders%rowtype;
  v_items jsonb;
  v_receipt_count integer;
  v_merchant_count integer;
  v_other_count integer;
begin
  -- D30: this function is service_role-only (grant below), but it still
  -- refuses to run on nonsense input rather than trusting the caller blindly.
  if p_store_id is null or coalesce(p_idempotency_key, '') = '' or coalesce(p_payload_fingerprint, '') = '' then
    raise exception 'store_id, idempotency_key and payload_fingerprint are all required';
  end if;

  if not exists (select 1 from ecommerce.stores where id = p_store_id) then
    raise exception 'unknown store_id %', p_store_id;
  end if;

  -- D12/D31: always exactly one customer receipt (order-received), and at
  -- most one merchant notification (merchant-new-order) -- enforced by
  -- shape, not just by counting, so a caller bug can never silently enqueue
  -- zero receipts, two receipts, or two merchant notifications.
  select
    count(*) filter (where n->>'templateKind' = 'order-received'),
    count(*) filter (where n->>'templateKind' = 'merchant-new-order'),
    count(*) filter (where n->>'templateKind' not in ('order-received', 'merchant-new-order'))
  into v_receipt_count, v_merchant_count, v_other_count
  from jsonb_array_elements(coalesce(p_notifications, '[]'::jsonb)) as n;

  if v_receipt_count <> 1 or v_merchant_count > 1 or v_other_count > 0 then
    raise exception
      'expected exactly one order-received notification and at most one merchant-new-order notification, got % order-received, % merchant-new-order, % other',
      v_receipt_count, v_merchant_count, v_other_count;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('ecommerce.orders.checkout_idempotency'),
    hashtext(p_store_id::text || '|' || p_idempotency_key)
  );

  select * into v_existing
  from ecommerce.orders
  where store_id = p_store_id and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.payload_fingerprint is distinct from p_payload_fingerprint then
      return jsonb_build_object('ok', false, 'reason', 'idempotency_conflict');
    end if;

    select coalesce(jsonb_agg(to_jsonb(oi.*) order by oi.created_at), '[]'::jsonb)
      into v_items
      from ecommerce.order_items oi
      where oi.order_id = v_existing.id;

    return jsonb_build_object('ok', true, 'replayed', true, 'order', to_jsonb(v_existing), 'items', v_items);
  end if;

  insert into ecommerce.orders (
    store_id, order_number, customer_type, user_id, customer_email, customer_first_name, customer_last_name,
    customer_phone, shipping_address, shipping_city, shipping_postal_code, shipping_country,
    shipping_department_code, shipping_department_name, shipping_municipality_code, shipping_location_id,
    shipping_status, shipping_notes, payment_method, payment_status, payment_reference, subtotal, shipping_cost,
    tax_amount, discount_amount, total_amount, currency_code, notes, metadata,
    idempotency_key, payload_fingerprint
  ) values (
    p_store_id,
    -- D13: the caller reserves this via ecommerce.generate_order_number
    -- BEFORE calling here, because the two outbox notifications are rendered
    -- in TS with the real order_number already in their text (SQL can't
    -- render React, so nothing could fill it in after the fact). Passing it
    -- through explicitly is what makes the persisted row match what the
    -- customer's email already says; leaving it null instead would let
    -- set_order_number_before_insert mint an UNRELATED number here.
    nullif(p_order->>'order_number', ''),
    coalesce(p_order->>'customer_type', 'guest'),
    nullif(p_order->>'user_id', '')::uuid,
    p_order->>'customer_email',
    p_order->>'customer_first_name',
    p_order->>'customer_last_name',
    p_order->>'customer_phone',
    p_order->>'shipping_address',
    p_order->>'shipping_city',
    p_order->>'shipping_postal_code',
    coalesce(p_order->>'shipping_country', 'Colombia'),
    p_order->>'shipping_department_code',
    p_order->>'shipping_department_name',
    p_order->>'shipping_municipality_code',
    nullif(p_order->>'shipping_location_id', '')::bigint,
    p_order->>'shipping_status',
    p_order->>'shipping_notes',
    p_order->>'payment_method',
    coalesce(p_order->>'payment_status', 'pending')::ecommerce.payment_status,
    p_order->>'payment_reference',
    (p_order->>'subtotal')::numeric,
    coalesce((p_order->>'shipping_cost')::numeric, 0),
    coalesce((p_order->>'tax_amount')::numeric, 0),
    coalesce((p_order->>'discount_amount')::numeric, 0),
    (p_order->>'total_amount')::numeric,
    coalesce(p_order->>'currency_code', 'COP'),
    p_order->>'notes',
    coalesce(p_order->'metadata', '{}'::jsonb),
    p_idempotency_key,
    p_payload_fingerprint
  )
  returning * into v_order;

  with inserted_items as (
    insert into ecommerce.order_items (
      order_id, product_id, product_name, product_sku, variant_id, variant_title,
      unit_price, quantity, total_price, currency_code, product_image_url, product_slug,
      selected_options, metadata
    )
    select
      v_order.id,
      nullif(x.product_id, '')::uuid,
      x.product_name,
      x.product_sku,
      nullif(x.variant_id, '')::uuid,
      x.variant_title,
      x.unit_price,
      x.quantity,
      x.total_price,
      coalesce(x.currency_code, 'COP'),
      x.product_image_url,
      x.product_slug,
      coalesce(x.selected_options, '{}'::jsonb),
      coalesce(x.metadata, '{}'::jsonb)
    from jsonb_to_recordset(p_items) as x(
      product_id text, product_name text, product_sku text, variant_id text, variant_title text,
      unit_price numeric, quantity integer, total_price numeric, currency_code text,
      product_image_url text, product_slug text, selected_options jsonb, metadata jsonb
    )
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted_items.*) order by inserted_items.created_at), '[]'::jsonb)
    into v_items
    from inserted_items;

  -- An order with zero items is exactly the kind of mid-way failure the RPC
  -- exists to make impossible: raising here rolls back the header insert too,
  -- since this whole function is one statement's implicit transaction.
  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  insert into ecommerce.email_outbox (
    store_id, template_kind, recipient_email, idempotency_key, from_address, reply_to_address,
    subject, html_body, text_body
  )
  select
    p_store_id,
    n->>'templateKind',
    n->>'recipientEmail',
    n->>'idempotencyKey',
    n->>'fromAddress',
    n->>'replyToAddress',
    n->>'subject',
    n->>'htmlBody',
    n->>'textBody'
  from jsonb_array_elements(p_notifications) as n;

  return jsonb_build_object('ok', true, 'replayed', false, 'order', to_jsonb(v_order), 'items', v_items);
end;
$$;

-- Same posture as ecommerce.decrement_inventory and ecommerce.provision_store:
-- the only caller is the checkout server action via getServiceEcommerceClient()
-- (service_role). Re-granted because create or replace can, in principle,
-- reset a function's privileges -- explicit here keeps that assumption from
-- ever silently drifting.
revoke all on function ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb) to service_role;

commit;
