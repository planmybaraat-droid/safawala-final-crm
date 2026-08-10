-- Split the single "event_team" work order task into two separate,
-- independently-tracked tasks: "styling" (on-site setup & handover, owned by
-- the Styling portal) and "travels" (travel/logistics coordination, owned by
-- the Travels portal). Both are created for rental bookings only, same as
-- event_team was. The trigger and RPC that create work orders/tasks, plus
-- the status-transition cascade, are updated to match.

CREATE SEQUENCE IF NOT EXISTS task_number_seq_st;
CREATE SEQUENCE IF NOT EXISTS task_number_seq_tr;
CREATE SEQUENCE IF NOT EXISTS st_task_seq;
CREATE SEQUENCE IF NOT EXISTS tr_task_seq;

CREATE OR REPLACE FUNCTION create_wo_from_product_order()
RETURNS TRIGGER AS $$
DECLARE
    v_wo_id UUID;
    v_wo_number TEXT;
    v_items_text TEXT := '';
    v_item RECORD;
    v_is_rental BOOLEAN;
BEGIN
    IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
        SELECT id INTO v_wo_id FROM work_orders
          WHERE booking_id = NEW.id AND booking_source = 'product_orders' LIMIT 1;
        IF v_wo_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        v_is_rental := (NEW.booking_type = 'rental');
        v_wo_number := generate_wo_number();

        INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
        VALUES (v_wo_number, NEW.id, 'product_orders', 'new', NEW.franchise_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_wo_id;

        IF v_wo_id IS NULL THEN
            SELECT id INTO v_wo_id FROM work_orders
              WHERE booking_id = NEW.id AND booking_source = 'product_orders' LIMIT 1;
        END IF;

        IF v_wo_id IS NULL THEN
            RETURN NEW;
        END IF;

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

        IF NOT EXISTS (SELECT 1 FROM work_order_tasks WHERE work_order_id = v_wo_id LIMIT 1) THEN
            INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
            VALUES
              (v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
               'Warehouse Picking - ' || NEW.order_number, 'active', v_items_text, '[]'::jsonb),
              (v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
               'Packing - ' || NEW.order_number, 'pending', 'Pack items and verify quantities.',
               '[{"text":"Safas Packed","checked":false},{"text":"Labels Applied","checked":false},{"text":"Count Verified","checked":false},{"text":"Photos Uploaded","checked":false}]'::jsonb),
              (v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
               'Dispatch - ' || NEW.order_number, 'pending', 'Dispatch material to venue location.',
               '[{"text":"Vehicle Assigned","checked":false},{"text":"Driver Assigned","checked":false},{"text":"Material Loaded","checked":false},{"text":"GPS Tracking","checked":false}]'::jsonb),
              (v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
               'Accounts & Billing - ' || NEW.order_number, 'active', 'Verify payment advances and collection requirements.',
               '[{"text":"Advance Payment Verification","checked":false},{"text":"Invoice Creation","checked":false},{"text":"Balance Collection","checked":false}]'::jsonb);

            IF v_is_rental THEN
                INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                VALUES
                  (v_wo_id, 'styling', 'ST-' || LPAD(nextval('task_number_seq_st')::TEXT, 4, '0'),
                   'Event Styling & Handover - ' || NEW.order_number, 'pending', 'Set up at event location and acquire client signature.',
                   '[{"text":"Team Reached","checked":false},{"text":"Setup Complete","checked":false},{"text":"Photos Taken","checked":false},{"text":"Client Sign-off","checked":false}]'::jsonb),
                  (v_wo_id, 'travels', 'TR-' || LPAD(nextval('task_number_seq_tr')::TEXT, 4, '0'),
                   'Travel Coordination - ' || NEW.order_number, 'pending', 'Arrange team travel and track arrival at event location.',
                   '[{"text":"Tickets Booked","checked":false},{"text":"Team Departed","checked":false},{"text":"Reached Venue","checked":false}]'::jsonb),
                  (v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
                   'Return Collection - ' || NEW.order_number, 'pending', 'Collect materials back, check damages, and send laundry.',
                   '[{"text":"Material Returned","checked":false},{"text":"Count Verified","checked":false},{"text":"Damage Checked","checked":false},{"text":"Laundry Required","checked":false}]'::jsonb);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  select id into v_existing_id from public.work_orders
    where booking_id = p_booking_id and booking_source = p_booking_source;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  v_wo_number := 'WO-' || v_year || '-' || lpad(nextval('work_order_number_seq')::text, 4, '0');

  insert into public.work_orders (work_order_number, booking_id, booking_source, franchise_id, status)
  values (v_wo_number, p_booking_id, p_booking_source, p_franchise_id, 'new')
  ON CONFLICT DO NOTHING
  returning id into v_wo_id;

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
        (v_wo_id, 'styling', 'ST-' || lpad(nextval('st_task_seq')::text,4,'0'), 'Event Styling & Handover - ' || p_order_number, 'pending', 'Set up at event location and acquire client signature.', '[{"text":"Team Reached","checked":false},{"text":"Setup Complete","checked":false},{"text":"Photos Taken","checked":false},{"text":"Client Sign-off","checked":false}]'::jsonb),
        (v_wo_id, 'travels', 'TR-' || lpad(nextval('tr_task_seq')::text,4,'0'), 'Travel Coordination - ' || p_order_number, 'pending', 'Arrange team travel and track arrival at event location.', '[{"text":"Tickets Booked","checked":false},{"text":"Team Departed","checked":false},{"text":"Reached Venue","checked":false}]'::jsonb),
        (v_wo_id, 'returns', 'RT-' || lpad(nextval('rt_task_seq')::text,4,'0'), 'Return Collection - ' || p_order_number, 'pending', 'Collect materials back, check damages, and send laundry.', '[{"text":"Material Returned","checked":false},{"text":"Count Verified","checked":false},{"text":"Damage Checked","checked":false},{"text":"Laundry Required","checked":false}]'::jsonb);
    end if;
  end if;

  return v_wo_id;
end;
$$;

revoke all on function public.create_work_order_for_booking(uuid,text,uuid,text,boolean,jsonb) from public;
grant execute on function public.create_work_order_for_booking(uuid,text,uuid,text,boolean,jsonb) to authenticated, service_role;
