-- The dispatch checklist (Vehicle Assigned / Driver Assigned / Material Loaded /
-- GPS Tracking) was unused boilerplate — the delivery portal's dispatch job
-- popup now only tracks "Stylist Confirmed" (a separate metadata-backed field,
-- not part of this checklist). Clear it for jobs already in flight and stop
-- seeding it for new ones across all three booking-source triggers.
UPDATE work_order_tasks
SET checklist = '[]'::jsonb, updated_at = now()
WHERE department = 'dispatch' AND status IN ('pending', 'active', 'shortage');

CREATE OR REPLACE FUNCTION public.create_wo_from_product_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
               '[]'::jsonb),
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
$function$;

CREATE OR REPLACE FUNCTION public.create_wo_from_direct_sale()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_wo_id UUID;
    v_wo_number TEXT;
    v_items_text TEXT := '';
    v_item RECORD;
BEGIN
    IF (NEW.status IN ('confirmed', 'completed', 'paid')) AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('confirmed', 'completed', 'paid')) THEN
        SELECT id INTO v_wo_id FROM work_orders WHERE booking_id = NEW.id AND booking_source = 'direct_sales_orders';

        IF v_wo_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        v_wo_number := generate_wo_number();

        INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
        VALUES (v_wo_number, NEW.id, 'direct_sales_orders', 'new', NEW.franchise_id)
        RETURNING id INTO v_wo_id;

        FOR v_item IN
            SELECT dsi.quantity, p.name, p.color, p.size
            FROM direct_sales_items dsi
            JOIN products p ON dsi.product_id = p.id
            WHERE dsi.sale_id = NEW.id
        LOOP
            v_items_text := v_items_text || '• Pick ' || v_item.quantity || 'x ' || v_item.name ||
                            ' (Color: ' || COALESCE(v_item.color, 'N/A') || ', Size: ' || COALESCE(v_item.size, 'N/A') || ')' || CHR(10);
        END LOOP;

        IF v_items_text = '' THEN
            v_items_text := 'No items added to direct sale.';
        END IF;

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
            'Warehouse Picking - ' || NEW.sale_number, 'active', v_items_text,
            '[]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
            'Packing - ' || NEW.sale_number, 'pending', 'Pack items and verify retail labels.',
            '[{"text": "Safas Packed", "checked": false}, {"text": "Labels Applied", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Photos Uploaded", "checked": false}]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
            'Dispatch - ' || NEW.sale_number, 'pending', 'Deliver purchased materials to customer.',
            '[]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
            'Accounts & Billing - ' || NEW.sale_number, 'active', 'Confirm full receipt for direct sale.',
            '[{"text": "Invoice Creation", "checked": false}, {"text": "Full Payment Received", "checked": false}]'::jsonb
        );
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_wo_from_package_booking()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_wo_id UUID;
    v_wo_number TEXT;
    v_items_text TEXT := '';
    v_item RECORD;
    v_category_name TEXT := '';
BEGIN
    IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
        SELECT id INTO v_wo_id FROM work_orders WHERE booking_id = NEW.id AND booking_source = 'package_bookings';

        IF v_wo_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        v_wo_number := generate_wo_number();

        INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
        VALUES (v_wo_number, NEW.id, 'package_bookings', 'new', NEW.franchise_id)
        RETURNING id INTO v_wo_id;

        FOR v_item IN
            SELECT pbpi.quantity, p.name, p.color, p.size
            FROM package_booking_product_items pbpi
            JOIN products p ON pbpi.product_id = p.id
            WHERE pbpi.package_booking_id = NEW.id
        LOOP
            v_items_text := v_items_text || '• Pick ' || v_item.quantity || 'x ' || v_item.name ||
                            ' (Color: ' || COALESCE(v_item.color, 'N/A') || ', Size: ' || COALESCE(v_item.size, 'N/A') || ')' || CHR(10);
        END LOOP;

        IF v_items_text = '' AND NEW.category_id IS NOT NULL THEN
            SELECT name INTO v_category_name FROM packages_categories WHERE id = NEW.category_id;
            IF v_category_name IS NOT NULL AND v_category_name <> '' THEN
                v_items_text := '• Selected Package Tier: ' || v_category_name || CHR(10) || 'Please customize product allocations.';
            END IF;
        END IF;

        IF v_items_text = '' THEN
            v_items_text := 'No items allocated for package booking yet.';
        END IF;

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
            'Warehouse Picking - ' || NEW.package_number, 'active', v_items_text,
            '[]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
            'Packing - ' || NEW.package_number, 'pending', 'Pack package items and verify turban counts.',
            '[{"text": "Safas Packed", "checked": false}, {"text": "Labels Applied", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Photos Uploaded", "checked": false}]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
            'Dispatch - ' || NEW.package_number, 'pending', 'Dispatch turbans and brooches to wedding venue.',
            '[]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'event_team', 'EV-' || LPAD(nextval('task_number_seq_ev')::TEXT, 4, '0'),
            'Event Setup & Handover - ' || NEW.package_number, 'pending', 'Turban tying event execution. Confirm ties & sign-off.',
            '[{"text": "Team Reached", "checked": false}, {"text": "Setup Complete", "checked": false}, {"text": "Photos Taken", "checked": false}, {"text": "Client Sign-off", "checked": false}]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
            'Return Collection - ' || NEW.package_number, 'pending', 'Collect rented safas and wedding accessories back.',
            '[{"text": "Material Returned", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Damage Checked", "checked": false}, {"text": "Laundry Required", "checked": false}]'::jsonb
        );

        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
            'Accounts & Billing - ' || NEW.package_number, 'active', 'Verify wedding package payments.',
            '[{"text": "Advance Payment Verification", "checked": false}, {"text": "Invoice Creation", "checked": false}, {"text": "Balance Collection", "checked": false}]'::jsonb
        );
    END IF;
    RETURN NEW;
END;
$function$;
