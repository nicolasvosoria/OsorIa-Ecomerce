-- Fail-closed contract verification for OsorIA Ecommerce.
do $$
declare
  v_missing text[];
begin
  select array_agg(required_schema) into v_missing
  from (values ('ecommerce')) req(required_schema)
  where not exists (select 1 from information_schema.schemata where schema_name = req.required_schema);

  if v_missing is not null then
    raise exception 'Missing required schemas: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(format('%s.%s', required_table, required_column) order by required_table, required_column) into v_missing
  from (values
    ('store_items','item_description_html'),('store_items','currency_code'),('store_items','inventory_quantity'),
    ('store_items','seo_title'),('store_items','seo_description'),('store_items','tags'),('store_items','primary_image_url'),
    ('store_items','primary_image_alt'),('product_combos','id'),('product_combos','store_id'),('product_combos','slug'),
    ('product_combos','is_active'),('product_combos','discount_type'),('product_combos','discount_value'),
    ('product_combo_components','combo_id'),('product_combo_components','product_id'),('product_combo_components','variant_id'),
    ('product_combo_components','quantity'),('product_combo_components','display_order'),('order_combo_snapshots','order_id'),
    ('order_combo_snapshots','order_item_id'),('order_combo_snapshots','combo_id'),('order_combo_snapshots','ordered_quantity'),
    ('order_combo_snapshots','component_subtotal'),('order_combo_snapshots','discount_type'),('order_combo_snapshots','discount_value'),
    ('order_combo_snapshots','discount_amount'),('order_combo_snapshots','charged_unit_price'),('order_combo_snapshots','charged_line_total'),
    ('order_combo_snapshots','currency_code'),('order_combo_snapshots','snapshot'),('orders','customer_type'),
    ('orders','customer_first_name'),('orders','customer_last_name'),('orders','payment_method'),('orders','payment_reference'),
    ('orders','shipping_address'),('order_addresses','address_type'),('order_addresses','address_line_1'),
    ('payment_transactions','transaction_type'),('payment_transactions','provider_payment_method'),
    ('payment_transactions','provider_transaction_id'),('payment_transactions','provider_txn_id'),('payment_transactions','metadata'),
    ('payment_transactions','raw_response')
  ) req(required_table, required_column)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'ecommerce'
      and c.table_name = req.required_table
      and c.column_name = req.required_column
  );

  if v_missing is not null then
    raise exception 'Missing runtime compatibility columns: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(required_table order by required_table) into v_missing
  from (values
    ('app_fonts'),('app_theme_versions'),('app_themes'),('cart_items'),('carts'),('component_styles'),
    ('inventory_movements'),('item_categories'),('item_images'),('item_metrics'),('item_option_values'),
    ('item_options'),('item_seo'),('item_tags'),('item_variants'),('order_addresses'),('order_items'),
    ('orders'),('order_combo_snapshots'),('payment_transactions'),('permissions'),('product_combo_components'),
    ('product_combos'),('role_permissions'),('roles'),('shipments'),('store_branding'),('store_commerce_settings'),
    ('store_contact'),('store_integrations'),('store_items'),('store_seo'),('store_seo_keywords'),
    ('store_user_roles'),('store_users'),('stores'),('user_profiles')
  ) req(required_table)
  where to_regclass(format('ecommerce.%I', req.required_table)) is null;

  if v_missing is not null then
    raise exception 'Missing ecommerce tables: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(required_view order by required_view) into v_missing
  from (values ('app_fonts_legacy'),('app_themes_legacy'),('component_styles_legacy'),('item_options_legacy'),('orders_legacy'),('store_items_legacy'),('stores_legacy')) req(required_view)
  where to_regclass(format('ecommerce.%I', req.required_view)) is null;

  if v_missing is not null then
    raise exception 'Missing ecommerce compatibility views: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(required_function order by required_function) into v_missing
  from (values ('increment_item_views'),('is_component_styles_admin'),('is_storage_admin')) req(required_function)
  where not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'ecommerce' and p.proname = req.required_function
  );

  if v_missing is not null then
    raise exception 'Missing ecommerce functions: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(required_bucket order by required_bucket) into v_missing
  from (values ('products'),('component-images'),('marketing-assets')) req(required_bucket)
  where not exists (select 1 from storage.buckets where id = req.required_bucket and public is true);

  if v_missing is not null then
    raise exception 'Missing or private ecommerce buckets: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name in ('stores','store_items','orders','component_styles','app_themes','app_fonts')) then
    raise exception 'Ecommerce-like tables found in public schema. public is not a valid ecommerce target.';
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(table_name order by table_name) into v_missing
  from (values ('product_combos'),('product_combo_components'),('order_combo_snapshots')) req(table_name)
  where not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ecommerce' and c.relname = req.table_name and c.relrowsecurity is true
  );

  if v_missing is not null then
    raise exception 'Combo tables missing enabled RLS: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(required_constraint order by required_constraint) into v_missing
  from (values
    ('product_combos_discount_type_chk'),('product_combos_discount_value_nonnegative_chk'),
    ('product_combo_components_quantity_positive_chk'),('product_combo_components_variant_belongs_to_product_fk'),
    ('order_combo_snapshots_ordered_quantity_positive_chk'),('order_combo_snapshots_component_subtotal_nonnegative_chk'),
    ('order_combo_snapshots_discount_value_nonnegative_chk'),('order_combo_snapshots_discount_amount_nonnegative_chk'),
    ('order_combo_snapshots_charged_unit_price_nonnegative_chk'),('order_combo_snapshots_charged_line_total_nonnegative_chk'),
    ('order_combo_snapshots_item_belongs_to_order_fk')
  ) req(required_constraint)
  where not exists (select 1 from pg_constraint where conname = req.required_constraint);

  if v_missing is not null then
    raise exception 'Missing combo constraints: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(required_index order by required_index) into v_missing
  from (values
    ('product_combos_store_active_idx'),('product_combo_components_combo_idx'),('product_combo_components_product_idx'),
    ('product_combo_components_combo_product_no_variant_unique'),('product_combo_components_combo_product_variant_unique'),
    ('order_combo_snapshots_order_idx'),('item_variants_id_item_id_unique'),('order_items_id_order_id_unique')
  ) req(required_index)
  where not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ecommerce' and c.relname = req.required_index and c.relkind = 'i'
  );

  if v_missing is not null then
    raise exception 'Missing combo indexes: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
begin
  if not has_table_privilege('anon', 'ecommerce.product_combos', 'select') then
    raise exception 'anon lacks SELECT on ecommerce.product_combos';
  end if;
  if not has_table_privilege('anon', 'ecommerce.product_combo_components', 'select') then
    raise exception 'anon lacks SELECT on ecommerce.product_combo_components';
  end if;
  if has_table_privilege('anon', 'ecommerce.order_combo_snapshots', 'select') then
    raise exception 'anon should not have SELECT on ecommerce.order_combo_snapshots';
  end if;
  if not has_table_privilege('authenticated', 'ecommerce.order_combo_snapshots', 'select') then
    raise exception 'authenticated lacks SELECT on ecommerce.order_combo_snapshots';
  end if;
  if not has_table_privilege('authenticated', 'ecommerce.product_combos', 'insert') then
    raise exception 'authenticated lacks INSERT on ecommerce.product_combos';
  end if;
  if not has_table_privilege('service_role', 'ecommerce.order_combo_snapshots', 'insert') then
    raise exception 'service_role lacks INSERT on ecommerce.order_combo_snapshots';
  end if;
end $$;

select 'ecommerce contract ok' as status;
