-- Atomic checkout order creation (D27, D28, D12, D30, D13).
--
-- Before this migration, app/checkout/actions.ts wrote the order header and
-- its items as two separate PostgREST insert() calls (lib/supabase/orders-api.ts,
-- createOrder), each its own HTTP request and its own transaction -- the same
-- orphaned-write hazard ecommerce.provision_store and ecommerce.decrement_inventory
-- already exist to close (see their own comments). A failure between the two
-- inserts left a header with no items; the confirmation email was a
-- best-effort side call in after(), so a checkout could "succeed" with no
-- notification ever queued.
--
-- ecommerce.create_order_with_notifications replaces both writes with ONE
-- locked function: header + items + exactly two email_outbox rows (D12 --
-- one customer receipt, one merchant notification) all land in the single
-- implicit transaction a PostgREST RPC call already gets, or none of them do.
-- The two notification payloads are pre-rendered in TS (lib/email/render.tsx
-- -- SQL can't render React, D13) and stored verbatim, so a later branding or
-- order edit can never change what's already queued, same guarantee as
-- ecommerce.request_store_mailbox_verification already gives the mailbox
-- verification email.
--
-- D28 checkout idempotency: idempotency_key is the caller-supplied
-- correlation token for one checkout attempt (regenerated per page load,
-- reused across retries within it -- app/checkout/page.tsx); payload_fingerprint
-- is a hash of the submitted payload. An identical retry (same key, same
-- fingerprint) returns the already-completed order instead of creating a
-- second one; the same key with a different fingerprint is rejected outright.
-- A pg_advisory_xact_lock keyed on (store_id, idempotency_key) serializes
-- concurrent retries the same way ecommerce.generate_order_number serializes
-- concurrent order-number allocation, so two requests racing on the same key
-- can never both decide "no existing order yet" and both insert.
--
-- Scope: ecommerce schema only.

alter table ecommerce.orders
  add column if not exists idempotency_key text,
  add column if not exists payload_fingerprint text;

comment on column ecommerce.orders.idempotency_key is
  'D28: per-store checkout correlation key supplied by the client for one checkout attempt. Null for any order not created through ecommerce.create_order_with_notifications.';
comment on column ecommerce.orders.payload_fingerprint is
  'D28: hash of the checkout payload the idempotency_key was issued for. A retry with the same key but a different fingerprint is rejected, never silently applied.';

-- Multiple NULLs are allowed by a plain unique index (Postgres treats each
-- NULL as distinct), so this never constrains rows outside the checkout path.
create unique index if not exists orders_store_id_idempotency_key_key
  on ecommerce.orders (store_id, idempotency_key);

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
begin
  -- D30: this function is service_role-only (grant below), but it still
  -- refuses to run on nonsense input rather than trusting the caller blindly.
  if p_store_id is null or coalesce(p_idempotency_key, '') = '' or coalesce(p_payload_fingerprint, '') = '' then
    raise exception 'store_id, idempotency_key and payload_fingerprint are all required';
  end if;

  if not exists (select 1 from ecommerce.stores where id = p_store_id) then
    raise exception 'unknown store_id %', p_store_id;
  end if;

  -- D12: exactly two recipient events per order, enforced here so a caller
  -- bug can never silently enqueue one, three, or zero.
  if p_notifications is null or jsonb_array_length(p_notifications) <> 2 then
    raise exception 'expected exactly two outbox notifications, got %', coalesce(jsonb_array_length(p_notifications), 0);
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

comment on function ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb) is
  'Creates an order header, its items and exactly two email_outbox rows (customer receipt + merchant notification) atomically. Idempotent on (store_id, idempotency_key): an identical retry (same payload_fingerprint) returns the existing order; a reused key with a different fingerprint is rejected via {ok:false, reason:idempotency_conflict}.';

-- Same posture as ecommerce.decrement_inventory and ecommerce.provision_store:
-- the only caller is the checkout server action via getServiceEcommerceClient()
-- (service_role). No table access is granted to reach this -- the function
-- inserts into orders/order_items/email_outbox internally as its owner.
revoke all on function ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb) to service_role;
