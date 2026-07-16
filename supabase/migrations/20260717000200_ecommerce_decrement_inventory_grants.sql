-- ecommerce.decrement_inventory is SECURITY DEFINER and had EXECUTE granted to
-- PUBLIC by default (proacl NULL). It performs an unconditional inventory
-- write (UPDATE ecommerce.item_variants / ecommerce.store_items) without
-- checking auth.uid(), can_manage_store or the order at all: p_store_id is
-- only used to label the inventory_movements row, never to authorize the
-- call. Since the anon key ships in the browser bundle, anyone could call
-- POST /rest/v1/rpc/decrement_inventory directly and drain any store's stock.
--
-- The only caller is app/api/orders/route.ts, which always invokes it through
-- getServiceEcommerceClient() (service_role). Revoking PUBLIC execute does
-- not affect checkout. Same grant pattern as ecommerce.provision_store in
-- 20260717000100_ecommerce_store_provisioning.sql.

revoke execute on function ecommerce.decrement_inventory(uuid, uuid, jsonb) from public;
grant execute on function ecommerce.decrement_inventory(uuid, uuid, jsonb) to service_role;

comment on function ecommerce.decrement_inventory(uuid, uuid, jsonb) is
  'Descuenta inventario de variantes/productos de forma atómica y condicional por item (p_items: [{variant_id, product_id, quantity}]). Devuelve un jsonb con los items sin stock suficiente (faltantes); vacío si todo se descontó. Es la autoridad sobre el stock: la validación previa en la aplicación es solo un pre-chequeo best-effort. EXECUTE restringido a service_role: la función no valida auth.uid() ni el pedido, solo confía en el caller, así que dejarla abierta a PUBLIC permitiría a cualquiera con la anon key descontar el stock de cualquier tienda vía RPC directo.';
