-- Descuento de inventario ATÓMICO para evitar sobreventa en compras concurrentes.
--
-- El flujo anterior en la aplicación hacía "leer cantidad -> restar en JS ->
-- escribir" (lib/supabase/orders-api.ts, updateInventoryAfterOrder). Dos
-- compras concurrentes por el último stock podían leer el mismo valor antes
-- de que ninguna escribiera, y ambas descontaban: sobreventa.
--
-- ecommerce.decrement_inventory hace el chequeo y el descuento en la MISMA
-- sentencia UPDATE condicional (WHERE inventory_quantity >= qty), y todos los
-- items de una orden se procesan dentro de la única transacción implícita de
-- la función. Esta función pasa a ser la AUTORIDAD sobre el stock: la
-- validación previa en la aplicación (validateInventoryBeforeOrder) queda
-- como un pre-chequeo best-effort para UX, no como garantía.

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
begin
  if p_items is null then
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
  'Descuenta inventario de variantes/productos de forma atómica y condicional por item (p_items: [{variant_id, product_id, quantity}]). Devuelve un jsonb con los items sin stock suficiente (faltantes); vacío si todo se descontó. Es la autoridad sobre el stock: la validación previa en la aplicación es solo un pre-chequeo best-effort.';
