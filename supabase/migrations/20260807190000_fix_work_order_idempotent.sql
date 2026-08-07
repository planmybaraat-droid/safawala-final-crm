-- Fix: Make work_order creation fully idempotent
-- The trigger `trg_create_wo_product_order` was using a plain INSERT which would
-- throw `duplicate key value violates unique constraint "work_orders_work_order_number_key"`
-- when the API also called create_work_order_for_booking RPC for the same booking.
-- This patch replaces the trigger function with a version that uses INSERT ... ON CONFLICT DO NOTHING.

CREATE OR REPLACE FUNCTION create_wo_from_product_order()
RETURNS TRIGGER AS $$
DECLARE
    v_wo_id UUID;
    v_wo_number TEXT;
    v_items_text TEXT := '';
    v_item RECORD;
    v_is_rental BOOLEAN;
BEGIN
    -- Only trigger when booking status transitions to 'confirmed'
    IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
        -- Check if work order already exists for this order (idempotency check)
        SELECT id INTO v_wo_id FROM work_orders
          WHERE booking_id = NEW.id AND booking_source = 'product_orders'
          LIMIT 1;

        IF v_wo_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        v_is_rental := (NEW.booking_type = 'rental');
        v_wo_number := generate_wo_number();

        -- Create Work Order using INSERT ... ON CONFLICT DO NOTHING to avoid
        -- duplicate key errors when the API RPC already created the row.
        INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
        VALUES (v_wo_number, NEW.id, 'product_orders', 'new', NEW.franchise_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_wo_id;

        -- If insert was skipped (ON CONFLICT), fetch the existing row
        IF v_wo_id IS NULL THEN
            SELECT id INTO v_wo_id FROM work_orders
              WHERE booking_id = NEW.id AND booking_source = 'product_orders'
              LIMIT 1;
        END IF;

        -- If we still can't find the work_order, bail out gracefully
        IF v_wo_id IS NULL THEN
            RETURN NEW;
        END IF;

        -- Gather picking instructions from product_order_items
        FOR v_item IN
            SELECT poi.quantity, p.name, p.color, p.size
            FROM product_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            WHERE poi.order_id = NEW.id
        LOOP
            v_items_text := v_items_text || '• Pick ' || v_item.quantity || 'x ' ||
                            COALESCE(v_item.name, 'Item') ||
                            ' (Color: ' || COALESCE(v_item.color, 'N/A') ||
                            ', Size: ' || COALESCE(v_item.size, 'N/A') || ')' || CHR(10);
        END LOOP;

        IF v_items_text = '' THEN
            v_items_text := 'No items added to order items list.';
        END IF;

        -- Only insert tasks if this work_order has none yet (idempotency)
        IF NOT EXISTS (SELECT 1 FROM work_order_tasks WHERE work_order_id = v_wo_id LIMIT 1) THEN
            -- 1. WH Task (Active)
            INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
            VALUES (
                v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
                'Warehouse Picking - ' || NEW.order_number, 'active', v_items_text,
                '[]'::jsonb
            ) ON CONFLICT DO NOTHING;

            -- 2. PK Task (Pending)
            INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
            VALUES (
                v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
                'Packing - ' || NEW.order_number, 'pending', 'Pack items and verify quantities.',
                '[{"text": "Safas Packed", "checked": false}, {"text": "Labels Applied", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Photos Uploaded", "checked": false}]'::jsonb
            ) ON CONFLICT DO NOTHING;

            -- 3. DP Task (Pending)
            INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
            VALUES (
                v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
                'Dispatch - ' || NEW.order_number, 'pending', 'Dispatch material to venue location.',
                '[{"text": "Vehicle Assigned", "checked": false}, {"text": "Driver Assigned", "checked": false}, {"text": "Material Loaded", "checked": false}, {"text": "GPS Tracking", "checked": false}]'::jsonb
            ) ON CONFLICT DO NOTHING;

            -- 4. EV Task (Pending) - Only for Rentals
            IF v_is_rental THEN
                INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                VALUES (
                    v_wo_id, 'event_team', 'EV-' || LPAD(nextval('task_number_seq_ev')::TEXT, 4, '0'),
                    'Event Setup & Handover - ' || NEW.order_number, 'pending', 'Setup at event location and acquire client signature.',
                    '[{"text": "Team Reached", "checked": false}, {"text": "Setup Complete", "checked": false}, {"text": "Photos Taken", "checked": false}, {"text": "Client Sign-off", "checked": false}]'::jsonb
                ) ON CONFLICT DO NOTHING;

                -- 5. RT Task (Pending)
                INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                VALUES (
                    v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
                    'Return Collection - ' || NEW.order_number, 'pending', 'Collect materials back, check damages, and send laundry.',
                    '[{"text": "Material Returned", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Damage Checked", "checked": false}, {"text": "Laundry Required", "checked": false}]'::jsonb
                ) ON CONFLICT DO NOTHING;
            END IF;

            -- 6. AC Task (Active)
            INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
            VALUES (
                v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
                'Accounts & Billing - ' || NEW.order_number, 'active', 'Verify payment advances and collection requirements.',
                '[{"text": "Advance Payment Verification", "checked": false}, {"text": "Invoice Creation", "checked": false}, {"text": "Balance Collection", "checked": false}]'::jsonb
            ) ON CONFLICT DO NOTHING;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also fix the create_work_order_for_booking RPC to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.create_work_order_for_booking(
  p_booking_id uuid,
  p_booking_source text,
  p_franchise_id uuid,
  p_order_number text,
  p_is_rental boolean,
  p_items jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  v_existing_id uuid;
  v_wo_id uuid;
  v_wo_number text;
  v_year text := to_char(now(), 'YYYY');
  v_instructions text;
begin
  -- Idempotency: return existing work order if one exists
  select id into v_existing_id from public.work_orders
    where booking_id = p_booking_id and booking_source = p_booking_source;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  v_wo_number := 'WO-' || v_year || '-' || lpad(nextval('work_order_number_seq')::text, 4, '0');

  -- Use ON CONFLICT DO NOTHING to avoid duplicate key errors from the trigger
  insert into public.work_orders (work_order_number, booking_id, booking_source, franchise_id, status)
  values (v_wo_number, p_booking_id, p_booking_source, p_franchise_id, 'new')
  ON CONFLICT DO NOTHING
  returning id into v_wo_id;

  -- If insert was skipped, fetch the row created by the trigger
  if v_wo_id is null then
    select id into v_wo_id from public.work_orders
      where booking_id = p_booking_id and booking_source = p_booking_source;
  end if;

  if v_wo_id is null then
    return null;
  end if;

  select coalesce(
    string_agg(format('%s x %s', (item->>'quantity'), (item->>'product_name')), E'\n'),
    'No items added to order items list.'
  ) into v_instructions
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  -- Only insert tasks if none exist yet
  if not exists (select 1 from public.work_order_tasks where work_order_id = v_wo_id limit 1) then
    insert into public.work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
    values
      (v_wo_id, 'warehouse', 'WH-' || lpad(nextval('wh_task_seq')::text,4,'0'), 'Warehouse Picking - ' || p_order_number, 'active', v_instructions, '[]'::jsonb),
      (v_wo_id, 'packing', 'PK-' || lpad(nextval('pk_task_seq')::text,4,'0'), 'Packing - ' || p_order_number, 'pending', 'Pack items and verify quantities.', '[{"text":"Safas Packed","checked":false},{"text":"Labels Applied","checked":false},{"text":"Count Verified","checked":false},{"text":"Photos Uploaded","checked":false}]'::jsonb),
      (v_wo_id, 'dispatch', 'DP-' || lpad(nextval('dp_task_seq')::text,4,'0'), 'Dispatch - ' || p_order_number, 'pending', 'Dispatch material to venue location.', '[{"text":"Vehicle Assigned","checked":false},{"text":"Driver Assigned","checked":false},{"text":"Material Loaded","checked":false},{"text":"GPS Tracking","checked":false}]'::jsonb),
      (v_wo_id, 'accounts', 'AC-' || lpad(nextval('ac_task_seq')::text,4,'0'), 'Accounts & Billing - ' || p_order_number, 'active', 'Verify payment advances and collection requirements.', '[{"text":"Advance Payment Verification","checked":false},{"text":"Invoice Creation","checked":false},{"text":"Balance Collection","checked":false}]'::jsonb);

    if p_is_rental then
      insert into public.work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
      values
        (v_wo_id, 'event_team', 'EV-' || lpad(nextval('ev_task_seq')::text,4,'0'), 'Event Setup & Handover - ' || p_order_number, 'pending', 'Setup at event location and acquire client signature.', '[{"text":"Team Reached","checked":false},{"text":"Setup Complete","checked":false},{"text":"Photos Taken","checked":false},{"text":"Client Sign-off","checked":false}]'::jsonb),
        (v_wo_id, 'returns', 'RT-' || lpad(nextval('rt_task_seq')::text,4,'0'), 'Return Collection - ' || p_order_number, 'pending', 'Collect materials back, check damages, and send laundry.', '[{"text":"Material Returned","checked":false},{"text":"Count Verified","checked":false},{"text":"Damage Checked","checked":false},{"text":"Laundry Required","checked":false}]'::jsonb);
    end if;
  end if;

  return v_wo_id;
end;
$$;

revoke all on function public.create_work_order_for_booking(uuid,text,uuid,text,boolean,jsonb) from public;
grant execute on function public.create_work_order_for_booking(uuid,text,uuid,text,boolean,jsonb) to authenticated, service_role;
