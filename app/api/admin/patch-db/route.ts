import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// One-time DB patch endpoint — patches the work_order trigger to be idempotent
// using ON CONFLICT DO NOTHING so duplicate key errors never surface to users.
export async function GET(req: NextRequest) {
  // Only allow internal calls with secret
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== 'safawala-patch-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const SQL = `
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
            v_items_text := v_items_text || '• ' || v_item.quantity || 'x ' ||
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
               'Dispatch - ' || NEW.order_number, 'pending', 'Dispatch material to venue.',
               '[{"text":"Vehicle Assigned","checked":false},{"text":"Driver Assigned","checked":false},{"text":"Material Loaded","checked":false},{"text":"GPS Tracking","checked":false}]'::jsonb),
              (v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
               'Accounts & Billing - ' || NEW.order_number, 'active', 'Verify payment advances.',
               '[{"text":"Advance Payment Verification","checked":false},{"text":"Invoice Creation","checked":false},{"text":"Balance Collection","checked":false}]'::jsonb);

            IF v_is_rental THEN
                INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                VALUES
                  (v_wo_id, 'event_team', 'EV-' || LPAD(nextval('task_number_seq_ev')::TEXT, 4, '0'),
                   'Event Setup & Handover - ' || NEW.order_number, 'pending', 'Setup at event location.',
                   '[{"text":"Team Reached","checked":false},{"text":"Setup Complete","checked":false},{"text":"Photos Taken","checked":false},{"text":"Client Sign-off","checked":false}]'::jsonb),
                  (v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
                   'Return Collection - ' || NEW.order_number, 'pending', 'Collect materials back.',
                   '[{"text":"Material Returned","checked":false},{"text":"Count Verified","checked":false},{"text":"Damage Checked","checked":false},{"text":"Laundry Required","checked":false}]'::jsonb);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: SQL })
    if (error) {
      // Try alternative RPC name
      const { error: error2 } = await supabase.rpc('execute_sql', { query: SQL })
      if (error2) {
        return NextResponse.json({ 
          error: 'Could not run SQL via RPC', 
          detail: error.message,
          note: 'Please run the SQL manually in Supabase SQL Editor'
        }, { status: 500 })
      }
    }
    return NextResponse.json({ success: true, message: 'Trigger patched successfully' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
