-- Verified store email identity (O4, D4-D9).
--
-- D4 lists everything a store needs before it may publish or accept checkout:
-- display name, legal name, logo, primary color, phone, commercial address, a
-- verified Reply-To and a verified operational order mailbox. Display name,
-- logo and primary color already exist (stores.store_name, store_branding.*);
-- phone and commercial address already exist on store_contact. This migration
-- adds the two net-new pieces: stores.legal_name and the Reply-To / order
-- mailbox pair, each with its own pending/verified state (D6: the two mailbox
-- concerns stay independent even when they share one address).
--
-- D31: legal_name lands nullable and nothing here rejects an incomplete store
-- -- readiness is only computed (lib/stores/identity-readiness.ts), never
-- enforced. Enforcement is slice 7's job.
--
-- Scope: ecommerce schema only.

alter table ecommerce.stores add column if not exists legal_name text;

comment on column ecommerce.stores.legal_name is
  'Razón social de la tienda. Nace nula (D31): la publicación no la exige todavía.';

alter table ecommerce.store_contact
  add column if not exists reply_to_email text,
  add column if not exists reply_to_pending_email text,
  add column if not exists reply_to_verified_at timestamptz,
  add column if not exists order_mailbox_email text,
  add column if not exists order_mailbox_pending_email text,
  add column if not exists order_mailbox_verified_at timestamptz;

comment on column ecommerce.store_contact.reply_to_email is
  'Reply-To verificado que reciben los correos de esta tienda. Solo lo escriben las funciones de verificación (D30); nunca un UPDATE directo del admin.';
comment on column ecommerce.store_contact.order_mailbox_email is
  'Buzón operativo de pedidos, verificado. Puede coincidir con reply_to_email pero es un campo semánticamente independiente (D6).';

-- -----------------------------------------------------------------------------
-- D30: the verified/pending/verified_at columns are written ONLY by the locked
-- SECURITY DEFINER functions in 20260805000200 (which run as the function
-- owner and bypass grants), never by a direct client UPDATE/INSERT. The
-- baseline blanket grant ("insert, update, delete on all tables ... to
-- authenticated") already covers every column of this pre-existing table,
-- including the six just added, so it has to be narrowed the same way
-- 20260729000100 narrowed ecommerce.user_profiles: revoke the table-level
-- privilege first, then hand back only the columns the store admin may edit
-- directly (the pre-existing contact fields). Re-running is safe in that
-- order for the same reason noted there.
-- -----------------------------------------------------------------------------
revoke update on ecommerce.store_contact from authenticated;
grant update (contact_email, contact_phone, address, updated_at)
  on ecommerce.store_contact to authenticated;

revoke insert on ecommerce.store_contact from authenticated;
grant insert (store_id, contact_email, contact_phone, address, updated_at)
  on ecommerce.store_contact to authenticated;

-- -----------------------------------------------------------------------------
-- D9: subdomain gets a normalized DNS-label check at the database boundary.
-- Added NOT VALID on purpose -- validating immediately would fail the whole
-- migration (and this slice's `db reset`) the moment one existing row doesn't
-- match, which is exactly the "fake backfill" D9 forbids. Slice 7 runs
-- `validate constraint` once staging's rows are confirmed clean; until then
-- the constraint only blocks NEW violations, matching lib/stores/schemas.ts'
-- SUBDOMAIN_PATTERN and lib/email/urls.ts' SUBDOMAIN_PATTERN (both already
-- enforce this shape in application code -- this is the same rule at the
-- database boundary, not a new one).
-- -----------------------------------------------------------------------------
alter table ecommerce.stores
  add constraint stores_subdomain_dns_label_chk
  check (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$') not valid;
