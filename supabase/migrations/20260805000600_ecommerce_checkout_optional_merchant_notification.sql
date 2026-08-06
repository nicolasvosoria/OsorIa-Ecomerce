-- Optional merchant notification during the D31 pre-enforcement window
-- (slice 3 verifier finding 1).
--
-- ecommerce.create_order_with_notifications (20260805000500) required
-- exactly two notifications (D12), which assumed every store already has a
-- merchant recipient (order_mailbox_email or contact_email). The verifier
-- traced every write path to store_contact and found null-null is the
-- DEFAULT state of essentially every real store today: ecommerce.provision_store
-- never inserts a store_contact row, the only live write path
-- (updateStoreIdentityFields) never touches contact_email, and the mailbox
-- verification flow that sets order_mailbox_email is brand new. D31 keeps
-- checkout readiness enforcement OFF until slice 7, so
-- lib/checkout/order-notifications.ts can no longer promise a merchant
-- recipient exists -- the old hard "exactly two" check made checkout throw
-- before the RPC was even called for nearly every store.
--
-- D12's "exactly two" describes the steady state of a READY store, not a
-- rule this pre-activation window can hold. This relaxes the check from
-- "always exactly two" to "always exactly one order-received notification,
-- and at most one merchant-new-order notification" -- still fully checkable
-- in both modes, never "one or two, whatever": once enforcement is on, a
-- store with no merchant recipient fails checkout in TS before this
-- function is ever called (order-writer.ts's readiness gate), so a ready
-- store still always gets exactly two; while enforcement is off, an unready
-- store with no merchant recipient gets exactly one.
--
-- Scope: ecommerce schema only.

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
  'Creates an order header, its items and its email_outbox rows atomically: always exactly one order-received (customer receipt), and at most one merchant-new-order (merchant notification, omitted only while D31''s readiness enforcement is off and the store has no merchant recipient). Idempotent on (store_id, idempotency_key): an identical retry (same payload_fingerprint) returns the existing order; a reused key with a different fingerprint is rejected via {ok:false, reason:idempotency_conflict}.';
