-- Migration: Create Work Orders & Task Automation Schema
-- Target: Supabase postgres

-- 1. Create Sequences for Numbering
CREATE SEQUENCE IF NOT EXISTS work_order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS task_number_seq_wh START 1;
CREATE SEQUENCE IF NOT EXISTS task_number_seq_pk START 1;
CREATE SEQUENCE IF NOT EXISTS task_number_seq_dp START 1;
CREATE SEQUENCE IF NOT EXISTS task_number_seq_ev START 1;
CREATE SEQUENCE IF NOT EXISTS task_number_seq_rt START 1;
CREATE SEQUENCE IF NOT EXISTS task_number_seq_ac START 1;

-- 2. Create Work Orders Table
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID NOT NULL,
    booking_source VARCHAR(50) NOT NULL, -- 'product_orders', 'package_bookings', 'direct_sales_orders'
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Work Order Tasks Table
CREATE TABLE IF NOT EXISTS work_order_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    department VARCHAR(50) NOT NULL CHECK (department IN ('warehouse', 'packing', 'dispatch', 'event_team', 'returns', 'accounts')),
    task_number VARCHAR(50) UNIQUE NOT NULL, -- WH-0001, PK-0001, DP-0001, etc.
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'picked', 'shortage', 'completed', 'cancelled')),
    instructions TEXT, -- List of products to pick/pack/etc.
    checklist JSONB DEFAULT '[]'::jsonb, -- Checklist items
    photos JSONB DEFAULT '[]'::jsonb, -- Uploaded proof photos
    metadata JSONB DEFAULT '{}'::jsonb, -- driver_name, vehicle_number, customer_signature
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Indexes for Queries
CREATE INDEX IF NOT EXISTS idx_work_orders_booking_id ON work_orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_franchise_id ON work_orders(franchise_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_work_order_id ON work_order_tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_department ON work_order_tasks(department);
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_status ON work_order_tasks(status);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_tasks ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "work_orders_all_access" ON work_orders;
CREATE POLICY "work_orders_all_access" ON work_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "work_order_tasks_all_access" ON work_order_tasks;
CREATE POLICY "work_order_tasks_all_access" ON work_order_tasks FOR ALL USING (true) WITH CHECK (true);

-- 7. Trigger helper to generate sequences
CREATE OR REPLACE FUNCTION generate_wo_number() RETURNS TEXT AS $$
BEGIN
    RETURN 'WO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('work_order_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 8. Core Trigger Logic for Product Orders Confirmation
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
        -- Check if work order already exists for this order
        SELECT id INTO v_wo_id FROM work_orders WHERE booking_id = NEW.id AND booking_source = 'product_orders';
        
        IF v_wo_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        v_is_rental := (NEW.booking_type = 'rental');
        v_wo_number := generate_wo_number();

        -- Create Work Order
        INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
        VALUES (v_wo_number, NEW.id, 'product_orders', 'new', NEW.franchise_id)
        RETURNING id INTO v_wo_id;

        -- Gather picking instructions from product_order_items
        FOR v_item IN 
            SELECT poi.quantity, p.name, p.color, p.size 
            FROM product_order_items poi
            JOIN products p ON poi.product_id = p.id
            WHERE poi.order_id = NEW.id
        LOOP
            v_items_text := v_items_text || '• Pick ' || v_item.quantity || 'x ' || v_item.name || 
                            ' (Color: ' || COALESCE(v_item.color, 'N/A') || ', Size: ' || COALESCE(v_item.size, 'N/A') || ')' || CHR(10);
        END LOOP;

        IF v_items_text = '' THEN
            v_items_text := 'No items added to order items list.';
        END IF;

        -- 1. WH Task (Active)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
            'Warehouse Picking - ' || NEW.order_number, 'active', v_items_text,
            '[]'::jsonb
        );

        -- 2. PK Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
            'Packing - ' || NEW.order_number, 'pending', 'Pack items and verify quantities.',
            '[{"text": "Safas Packed", "checked": false}, {"text": "Labels Applied", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Photos Uploaded", "checked": false}]'::jsonb
        );

        -- 3. DP Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
            'Dispatch - ' || NEW.order_number, 'pending', 'Dispatch material to venue location.',
            '[{"text": "Vehicle Assigned", "checked": false}, {"text": "Driver Assigned", "checked": false}, {"text": "Material Loaded", "checked": false}, {"text": "GPS Tracking", "checked": false}]'::jsonb
        );

        -- 4. EV Task (Pending) - Only for Rentals
        IF v_is_rental THEN
            INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
            VALUES (
                v_wo_id, 'event_team', 'EV-' || LPAD(nextval('task_number_seq_ev')::TEXT, 4, '0'),
                'Event Setup & Handover - ' || NEW.order_number, 'pending', 'Setup at event location and acquire client signature.',
                '[{"text": "Team Reached", "checked": false}, {"text": "Setup Complete", "checked": false}, {"text": "Photos Taken", "checked": false}, {"text": "Client Sign-off", "checked": false}]'::jsonb
            );
            
            -- 5. RT Task (Pending)
            INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
            VALUES (
                v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
                'Return Collection - ' || NEW.order_number, 'pending', 'Collect materials back, check damages, and send laundry.',
                '[{"text": "Material Returned", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Damage Checked", "checked": false}, {"text": "Laundry Required", "checked": false}]'::jsonb
            );
        END IF;

        -- 6. AC Task (Active)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
            'Accounts & Billing - ' || NEW.order_number, 'active', 'Verify payment advances and collection requirements.',
            '[{"text": "Advance Payment Verification", "checked": false}, {"text": "Invoice Creation", "checked": false}, {"text": "Balance Collection", "checked": false}]'::jsonb
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_wo_product_order ON product_orders;
CREATE TRIGGER trg_create_wo_product_order
    AFTER INSERT OR UPDATE ON product_orders
    FOR EACH ROW
    EXECUTE FUNCTION create_wo_from_product_order();


-- 9. Trigger Logic for Package Bookings
CREATE OR REPLACE FUNCTION create_wo_from_package_booking()
RETURNS TRIGGER AS $$
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

        -- Create Work Order
        INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
        VALUES (v_wo_number, NEW.id, 'package_bookings', 'new', NEW.franchise_id)
        RETURNING id INTO v_wo_id;

        -- Gather picking instructions from package_booking_product_items
        FOR v_item IN 
            SELECT pbpi.quantity, p.name, p.color, p.size 
            FROM package_booking_product_items pbpi
            JOIN products p ON pbpi.product_id = p.id
            WHERE pbpi.package_booking_id = NEW.id
        LOOP
            v_items_text := v_items_text || '• Pick ' || v_item.quantity || 'x ' || v_item.name || 
                            ' (Color: ' || COALESCE(v_item.color, 'N/A') || ', Size: ' || COALESCE(v_item.size, 'N/A') || ')' || CHR(10);
        END LOOP;

        -- Fallback to category name if no product items are assigned yet
        IF v_items_text = '' AND NEW.category_id IS NOT NULL THEN
            SELECT name INTO v_category_name FROM packages_categories WHERE id = NEW.category_id;
            IF v_category_name IS NOT NULL AND v_category_name <> '' THEN
                v_items_text := '• Selected Package Tier: ' || v_category_name || CHR(10) || 'Please customize product allocations.';
            END IF;
        END IF;

        IF v_items_text = '' THEN
            v_items_text := 'No items allocated for package booking yet.';
        END IF;

        -- 1. WH Task (Active)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
            'Warehouse Picking - ' || NEW.package_number, 'active', v_items_text,
            '[]'::jsonb
        );

        -- 2. PK Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
            'Packing - ' || NEW.package_number, 'pending', 'Pack package items and verify turban counts.',
            '[{"text": "Safas Packed", "checked": false}, {"text": "Labels Applied", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Photos Uploaded", "checked": false}]'::jsonb
        );

        -- 3. DP Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
            'Dispatch - ' || NEW.package_number, 'pending', 'Dispatch turbans and brooches to wedding venue.',
            '[{"text": "Vehicle Assigned", "checked": false}, {"text": "Driver Assigned", "checked": false}, {"text": "Material Loaded", "checked": false}, {"text": "GPS Tracking", "checked": false}]'::jsonb
        );

        -- 4. EV Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'event_team', 'EV-' || LPAD(nextval('task_number_seq_ev')::TEXT, 4, '0'),
            'Event Setup & Handover - ' || NEW.package_number, 'pending', 'Turban tying event execution. Confirm ties & sign-off.',
            '[{"text": "Team Reached", "checked": false}, {"text": "Setup Complete", "checked": false}, {"text": "Photos Taken", "checked": false}, {"text": "Client Sign-off", "checked": false}]'::jsonb
        );
        
        -- 5. RT Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
            'Return Collection - ' || NEW.package_number, 'pending', 'Collect rented safas and wedding accessories back.',
            '[{"text": "Material Returned", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Damage Checked", "checked": false}, {"text": "Laundry Required", "checked": false}]'::jsonb
        );

        -- 6. AC Task (Active)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
            'Accounts & Billing - ' || NEW.package_number, 'active', 'Verify wedding package payments.',
            '[{"text": "Advance Payment Verification", "checked": false}, {"text": "Invoice Creation", "checked": false}, {"text": "Balance Collection", "checked": false}]'::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_wo_package_booking ON package_bookings;
CREATE TRIGGER trg_create_wo_package_booking
    AFTER INSERT OR UPDATE ON package_bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_wo_from_package_booking();


-- 10. Trigger Logic for Direct Sales
CREATE OR REPLACE FUNCTION create_wo_from_direct_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_wo_id UUID;
    v_wo_number TEXT;
    v_items_text TEXT := '';
    v_item RECORD;
BEGIN
    -- Direct Sales trigger on status = 'confirmed' or status = 'completed' or status = 'paid'
    IF (NEW.status IN ('confirmed', 'completed', 'paid')) AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('confirmed', 'completed', 'paid')) THEN
        SELECT id INTO v_wo_id FROM work_orders WHERE booking_id = NEW.id AND booking_source = 'direct_sales_orders';
        
        IF v_wo_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        v_wo_number := generate_wo_number();

        -- Create Work Order
        INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
        VALUES (v_wo_number, NEW.id, 'direct_sales_orders', 'new', NEW.franchise_id)
        RETURNING id INTO v_wo_id;

        -- Gather picking instructions from direct_sales_items
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

        -- 1. WH Task (Active)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
            'Warehouse Picking - ' || NEW.sale_number, 'active', v_items_text,
            '[]'::jsonb
        );

        -- 2. PK Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
            'Packing - ' || NEW.sale_number, 'pending', 'Pack items and verify retail labels.',
            '[{"text": "Safas Packed", "checked": false}, {"text": "Labels Applied", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Photos Uploaded", "checked": false}]'::jsonb
        );

        -- 3. DP Task (Pending)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
            'Dispatch - ' || NEW.sale_number, 'pending', 'Deliver purchased materials to customer.',
            '[{"text": "Vehicle Assigned", "checked": false}, {"text": "Driver Assigned", "checked": false}, {"text": "Material Loaded", "checked": false}, {"text": "GPS Tracking", "checked": false}]'::jsonb
        );

        -- 4. AC Task (Active)
        INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
        VALUES (
            v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
            'Accounts & Billing - ' || NEW.sale_number, 'active', 'Confirm full receipt for direct sale.',
            '[{"text": "Invoice Creation", "checked": false}, {"text": "Full Payment Received", "checked": false}]'::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_wo_direct_sale ON direct_sales_orders;
CREATE TRIGGER trg_create_wo_direct_sale
    AFTER INSERT OR UPDATE ON direct_sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION create_wo_from_direct_sale();
