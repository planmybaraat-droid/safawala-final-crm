// One-time script to patch the DB trigger and RPC to be idempotent
// Run with: node scripts/patch-work-order-trigger.js

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xplnyaxkusvuajtmorss.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbG55YXhrdXN2dWFqdG1vcnNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzNTkwOCwiZXhwIjoyMDcwMDExOTA4fQ.-46NLMqfpy8mKFgrQtW0KuW4_Vk5WeBmovy5QwFMiLY'
)

const SQL = `
-- Fix: Make the product_orders trigger idempotent using ON CONFLICT DO NOTHING
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
                  (v_wo_id, 'event_team', 'EV-' || LPAD(nextval('task_number_seq_ev')::TEXT, 4, '0'),
                   'Event Setup & Handover - ' || NEW.order_number, 'pending', 'Setup at event location and acquire client signature.',
                   '[{"text":"Team Reached","checked":false},{"text":"Setup Complete","checked":false},{"text":"Photos Taken","checked":false},{"text":"Client Sign-off","checked":false}]'::jsonb),
                  (v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
                   'Return Collection - ' || NEW.order_number, 'pending', 'Collect materials back, check damages, and send laundry.',
                   '[{"text":"Material Returned","checked":false},{"text":"Count Verified","checked":false},{"text":"Damage Checked","checked":false},{"text":"Laundry Required","checked":false}]'::jsonb);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

async function main() {
  console.log('Applying trigger patch...')
  
  // Use Supabase RPC to execute SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: SQL })
  
  if (error) {
    console.error('RPC exec_sql failed, trying direct approach...')
    console.error('Error:', error.message)
    
    // Try via REST API
    const res = await fetch('https://xplnyaxkusvuajtmorss.supabase.co/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbG55YXhrdXN2dWFqdG1vcnNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzNTkwOCwiZXhwIjoyMDcwMDExOTA4fQ.-46NLMqfpy8mKFgrQtW0KuW4_Vk5WeBmovy5QwFMiLY',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbG55YXhrdXN2dWFqdG1vcnNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzNTkwOCwiZXhwIjoyMDcwMDExOTA4fQ.-46NLMqfpy8mKFgrQtW0KuW4_Vk5WeBmovy5QwFMiLY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: SQL })
    })
    const result = await res.json()
    console.log('REST result:', JSON.stringify(result))
    return
  }
  
  console.log('✅ Trigger patched successfully!')
  console.log(data)
}

main().catch(console.error)
