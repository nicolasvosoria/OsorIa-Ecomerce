-- Closes the bypass slice 4's own verification reproduced: with can_manage_store
-- true for the order's store, `authenticated` could run
-- `UPDATE ecommerce.orders SET status = 'delivered' ...` directly and skip
-- ecommerce.transition_order_status (20260805000800) entirely. The frozen D29
-- graph and the D11 outbox insert both live INSIDE that function; a caller who
-- reaches the table instead of the function gets neither -- pending jumped
-- straight to delivered, and email_outbox stayed empty.
--
-- The cause: the baseline (20260425000100) grants `insert, update, delete on
-- all tables in schema ecommerce to authenticated`, which hands `authenticated`
-- UPDATE over the WHOLE orders row, status and the four lifecycle timestamps
-- included. orders_admin_update (20260426000100) only scopes the ROW
-- (can_manage_store(store_id)) -- it says nothing about columns, so the column
-- ACL was the only thing standing between a store admin and the graph, and it
-- was wide open.
--
-- Same shape as 20260729000100 (user_profiles) and 20260805000100
-- (store_contact): the table-level UPDATE privilege has to go first, then
-- every column comes back except the ones a direct write must never reach.
-- status/confirmed_at/shipped_at/delivered_at/cancelled_at are not among them
-- -- ecommerce.transition_order_status is their only writer now, running
-- SECURITY DEFINER as its owner, so it needs no grant to reach them. Every
-- OTHER column keeps exactly the access it already had; narrowing beyond
-- these five is a decision for the operator, not this migration (see the
-- slice report). Do NOT "simplify" this into `revoke update (status, ...)
-- ... from authenticated`: Postgres checks a column write against the column
-- ACL OR the table ACL, and a column-level revoke leaves the table-level
-- grant untouched -- the statement reports REVOKE, changes nothing, and
-- has_column_privilege still answers true. Re-running is safe in the order
-- below for the same reason noted at 20260729000100: a table-level revoke
-- also clears the column grants the next statement restores.
--
-- orders_admin_update is left AS IS. 20260805000100 already set the
-- precedent for this exact situation on store_contact: narrow the grant, not
-- the policy. A second, competing shape for the same case would be the trap
-- for the next reader, not the FOR UPDATE policy that still reads
-- can_manage_store(store_id) -- Postgres evaluates the column ACL before RLS
-- ever runs, so a caller who clears the policy's row check still cannot
-- reach these five columns.
--
-- Scope: ecommerce schema only.

revoke update on ecommerce.orders from authenticated;
grant update (
  id, store_id, order_number, order_date, customer_type, user_id, customer_email,
  customer_first_name, customer_last_name, customer_phone, shipping_address,
  shipping_city, shipping_postal_code, shipping_country, shipping_notes,
  payment_method, payment_status, payment_reference, subtotal, shipping_cost,
  tax_amount, discount_amount, total_amount, currency_code, notes, metadata,
  created_at, updated_at, idempotency_key, payload_fingerprint, inventory_decremented_at
) on ecommerce.orders to authenticated;
