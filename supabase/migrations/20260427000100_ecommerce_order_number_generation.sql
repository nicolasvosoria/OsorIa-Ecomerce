-- Generate collision-safe order numbers per store and calendar year.
--
-- The original baseline default produced the same value for every insert
-- in a year (ORD-YYYY-000001). This trigger makes order_number generation a
-- database invariant instead of relying on application code.

alter table ecommerce.orders
  alter column order_number drop default;

create or replace function ecommerce.generate_order_number(
  p_store_id uuid,
  p_order_date timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = ecommerce, public
as $$
declare
  v_year text := to_char(coalesce(p_order_date, now()), 'YYYY');
  v_next integer;
  v_candidate text;
begin
  if p_store_id is null then
    raise exception 'store_id is required to generate order_number';
  end if;

  -- Serialize generation for the same store/year. This avoids two concurrent
  -- checkouts calculating the same next suffix before either row is visible.
  perform pg_advisory_xact_lock(
    hashtext('ecommerce.orders.order_number'),
    hashtext(p_store_id::text || ':' || v_year)
  );

  select coalesce(
    max(substring(order_number from ('^ORD-' || v_year || '-([0-9]{6})$'))::integer),
    0
  ) + 1
  into v_next
  from ecommerce.orders
  where store_id = p_store_id;

  loop
    v_candidate := 'ORD-' || v_year || '-' || lpad(v_next::text, 6, '0');

    exit when not exists (
      select 1
      from ecommerce.orders
      where store_id = p_store_id
        and order_number = v_candidate
    );

    v_next := v_next + 1;
  end loop;

  return v_candidate;
end;
$$;

create or replace function ecommerce.set_order_number()
returns trigger
language plpgsql
security definer
set search_path = ecommerce, public
as $$
begin
  if new.order_date is null then
    new.order_date := now();
  end if;

  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := ecommerce.generate_order_number(new.store_id, new.order_date);
  end if;

  return new;
end;
$$;

drop trigger if exists set_order_number_before_insert on ecommerce.orders;

create trigger set_order_number_before_insert
before insert on ecommerce.orders
for each row
execute function ecommerce.set_order_number();

comment on function ecommerce.generate_order_number(uuid, timestamptz)
  is 'Generates collision-safe order numbers in the format ORD-YYYY-000001 per store/year.';

comment on trigger set_order_number_before_insert on ecommerce.orders
  is 'Assigns ecommerce.orders.order_number before insert when application code leaves it blank.';
