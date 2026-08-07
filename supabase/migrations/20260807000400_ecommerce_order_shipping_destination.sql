-- Structured shipping destination for both the order and the address book
-- (D2/D30, D24, D28).
--
-- Before this migration the checkout only ever collected free text: the
-- GUEST form's shipping_city was an optional Input, and app/checkout/page.tsx
-- hardcoded city: "" for every AUTHENTICATED order. Neither buyer's order
-- carried anything a later shipping-zone lookup could match against.
--
-- D2/D30: ecommerce.orders now also gets shipping_location_id, a real FK to
-- ecommerce.co_locations (20260807000100), ON DELETE RESTRICT so a municipio
-- can never be deleted out from under a placed order -- this is what makes
-- the code "validated" instead of unvalidated text. Alongside it, the order
-- freezes shipping_department_code/shipping_department_name at purchase
-- time: Divipola is keyed on (cod_dpto, cod_mpio) because municipality names
-- repeat across departments, so shipping_city (the municipio's name) alone
-- would be ambiguous forever without its department. shipping_municipality_code
-- freezes the DANE cod_mpio the same way, so nothing that reads orders later
-- ever has to join co_locations to know exactly where an order shipped.
-- shipping_city itself is untouched: it keeps carrying the destination's
-- display name, same column, now sourced from the picker instead of free
-- text.
--
-- D24: the address book (ecommerce.user_addresses) gets the identical four
-- columns, unprefixed (location_id, department_code, department_name,
-- municipality_code) since the table itself already is one address -- it is
-- the checkout's PREFILL source, so it has to carry the same structured
-- destination the checkout now collects, not just a free-text city.
--
-- All eight new columns are nullable: the live database has 1 order with no
-- city and 0 saved addresses (nothing to backfill), but the rule holds
-- regardless -- old rows and any writer that predates this migration must
-- keep working.
--
-- Scope: ecommerce schema only.

alter table ecommerce.orders
  add column if not exists shipping_location_id bigint references ecommerce.co_locations(id) on delete restrict,
  add column if not exists shipping_department_code text,
  add column if not exists shipping_department_name text,
  add column if not exists shipping_municipality_code text;

comment on column ecommerce.orders.shipping_location_id is
  'D2/D30: FK to ecommerce.co_locations, on delete restrict. Nullable: only ecommerce.create_order_with_notifications sets it, so any order created outside that RPC (there is none today) or predating this migration leaves it null.';
comment on column ecommerce.orders.shipping_department_code is
  'D2/D30: DANE cod_dpto, frozen at purchase time alongside shipping_location_id -- never re-derived by a join.';
comment on column ecommerce.orders.shipping_department_name is
  'D2/D30: paired with shipping_department_code. Divipola municipality names repeat across departments, so the department is what makes shipping_city unambiguous on its own.';
comment on column ecommerce.orders.shipping_municipality_code is
  'D2/D30: DANE cod_mpio, frozen alongside shipping_department_code -- together the Divipola (cod_dpto, cod_mpio) pair. shipping_city carries the municipio''s name, frozen the same way.';

alter table ecommerce.user_addresses
  add column if not exists location_id bigint references ecommerce.co_locations(id) on delete restrict,
  add column if not exists department_code text,
  add column if not exists department_name text,
  add column if not exists municipality_code text;

comment on column ecommerce.user_addresses.location_id is
  'D24: FK to ecommerce.co_locations, on delete restrict -- same posture as ecommerce.orders.shipping_location_id. Nullable: addresses saved before this migration (there are none in production today) never set it.';
comment on column ecommerce.user_addresses.department_code is
  'D24: DANE cod_dpto, frozen the same way ecommerce.orders freezes shipping_department_code -- the address book prefills checkout, it never joins co_locations to render itself.';
comment on column ecommerce.user_addresses.department_name is
  'D24: paired with department_code; disambiguates city, which repeats across departments in Divipola.';
comment on column ecommerce.user_addresses.municipality_code is
  'D24: DANE cod_mpio, paired with department_code as the Divipola (cod_dpto, cod_mpio) pair. city carries the municipio''s name.';

-- create or replace: same shape 20260805000600 already used to evolve this
-- function in place (same OID, so its existing `comment on function` from
-- 20260806000300 -- unaffected by this slice -- keeps applying and is not
-- restated here). Only change from the live body: shipping_location_id,
-- shipping_department_code, shipping_department_name and
-- shipping_municipality_code now travel through p_order into the insert,
-- grouped with the other shipping_* columns.
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
    shipping_notes, payment_method, payment_status, payment_reference, subtotal, shipping_cost,
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
