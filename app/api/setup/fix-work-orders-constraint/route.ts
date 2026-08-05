import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  return applyFix()
}

export async function POST(req: NextRequest) {
  return applyFix()
}

async function applyFix() {
  try {
    const supabase = createClient()

    const fixSql = `
      -- 1. Create sequences if not exists
      CREATE SEQUENCE IF NOT EXISTS work_order_number_seq;
      CREATE SEQUENCE IF NOT EXISTS task_number_seq_wh;
      CREATE SEQUENCE IF NOT EXISTS task_number_seq_pk;
      CREATE SEQUENCE IF NOT EXISTS task_number_seq_dp;
      CREATE SEQUENCE IF NOT EXISTS task_number_seq_ev;
      CREATE SEQUENCE IF NOT EXISTS task_number_seq_rt;
      CREATE SEQUENCE IF NOT EXISTS task_number_seq_ac;

      -- 2. Bump sequence values above max existing numbers to prevent collision
      SELECT setval('work_order_number_seq', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(work_order_number, '\\D', '', 'g'), '')::bigint), 0) FROM public.work_orders),
        1000
      ) + 1);

      SELECT setval('task_number_seq_wh', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(task_number, '\\D', '', 'g'), '')::bigint), 0) FROM public.work_order_tasks WHERE department = 'warehouse'),
        1000
      ) + 1);

      SELECT setval('task_number_seq_pk', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(task_number, '\\D', '', 'g'), '')::bigint), 0) FROM public.work_order_tasks WHERE department = 'packing'),
        1000
      ) + 1);

      SELECT setval('task_number_seq_dp', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(task_number, '\\D', '', 'g'), '')::bigint), 0) FROM public.work_order_tasks WHERE department = 'dispatch'),
        1000
      ) + 1);

      SELECT setval('task_number_seq_ev', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(task_number, '\\D', '', 'g'), '')::bigint), 0) FROM public.work_order_tasks WHERE department = 'event_team'),
        1000
      ) + 1);

      SELECT setval('task_number_seq_rt', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(task_number, '\\D', '', 'g'), '')::bigint), 0) FROM public.work_order_tasks WHERE department = 'returns'),
        1000
      ) + 1);

      SELECT setval('task_number_seq_ac', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(task_number, '\\D', '', 'g'), '')::bigint), 0) FROM public.work_order_tasks WHERE department = 'accounts'),
        1000
      ) + 1);

      -- 3. Collision-proof generate_wo_number() function
      CREATE OR REPLACE FUNCTION generate_wo_number() RETURNS TEXT AS $$
      DECLARE
          v_num TEXT;
          v_seq BIGINT;
      BEGIN
          LOOP
              v_seq := nextval('work_order_number_seq');
              v_num := 'WO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_seq::TEXT, 4, '0');
              IF NOT EXISTS (SELECT 1 FROM public.work_orders WHERE work_order_number = v_num) THEN
                  RETURN v_num;
              END IF;
          END LOOP;
      END;
      $$ LANGUAGE plpgsql;

      -- 4. Fail-safe create_wo_from_product_order() trigger function
      CREATE OR REPLACE FUNCTION create_wo_from_product_order()
      RETURNS TRIGGER AS $$
      DECLARE
          v_wo_id UUID;
          v_wo_number TEXT;
          v_items_text TEXT := '';
          v_item RECORD;
          v_is_rental BOOLEAN;
      BEGIN
          BEGIN
              IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
                  SELECT id INTO v_wo_id FROM work_orders WHERE booking_id = NEW.id AND booking_source = 'product_orders';
                  
                  IF v_wo_id IS NOT NULL THEN
                      RETURN NEW;
                  END IF;

                  v_is_rental := (NEW.booking_type = 'rental');
                  v_wo_number := generate_wo_number();

                  INSERT INTO work_orders (work_order_number, booking_id, booking_source, status, franchise_id)
                  VALUES (v_wo_number, NEW.id, 'product_orders', 'new', NEW.franchise_id)
                  RETURNING id INTO v_wo_id;

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

                  INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                  VALUES (
                      v_wo_id, 'warehouse', 'WH-' || LPAD(nextval('task_number_seq_wh')::TEXT, 4, '0'),
                      'Warehouse Picking - ' || NEW.order_number, 'active', v_items_text, '[]'::jsonb
                  );

                  INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                  VALUES (
                      v_wo_id, 'packing', 'PK-' || LPAD(nextval('task_number_seq_pk')::TEXT, 4, '0'),
                      'Packing - ' || NEW.order_number, 'pending', 'Pack items and verify quantities.',
                      '[{"text": "Safas Packed", "checked": false}, {"text": "Labels Applied", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Photos Uploaded", "checked": false}]'::jsonb
                  );

                  INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                  VALUES (
                      v_wo_id, 'dispatch', 'DP-' || LPAD(nextval('task_number_seq_dp')::TEXT, 4, '0'),
                      'Dispatch - ' || NEW.order_number, 'pending', 'Dispatch material to venue location.',
                      '[{"text": "Vehicle Assigned", "checked": false}, {"text": "Driver Assigned", "checked": false}, {"text": "Material Loaded", "checked": false}, {"text": "GPS Tracking", "checked": false}]'::jsonb
                  );

                  IF v_is_rental THEN
                      INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                      VALUES (
                          v_wo_id, 'event_team', 'EV-' || LPAD(nextval('task_number_seq_ev')::TEXT, 4, '0'),
                          'Event Setup & Handover - ' || NEW.order_number, 'pending', 'Setup at event location and acquire client signature.',
                          '[{"text": "Team Reached", "checked": false}, {"text": "Setup Complete", "checked": false}, {"text": "Photos Taken", "checked": false}, {"text": "Client Sign-off", "checked": false}]'::jsonb
                      );
                      
                      INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                      VALUES (
                          v_wo_id, 'returns', 'RT-' || LPAD(nextval('task_number_seq_rt')::TEXT, 4, '0'),
                          'Return Collection - ' || NEW.order_number, 'pending', 'Collect materials back, check damages, and send laundry.',
                          '[{"text": "Material Returned", "checked": false}, {"text": "Count Verified", "checked": false}, {"text": "Damage Checked", "checked": false}, {"text": "Laundry Required", "checked": false}]'::jsonb
                      );
                  END IF;

                  INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
                  VALUES (
                      v_wo_id, 'accounts', 'AC-' || LPAD(nextval('task_number_seq_ac')::TEXT, 4, '0'),
                      'Accounts & Billing - ' || NEW.order_number, 'active', 'Verify payment advances and collection requirements.',
                      '[{"text": "Advance Payment Verification", "checked": false}, {"text": "Invoice Creation", "checked": false}, {"text": "Balance Collection", "checked": false}]'::jsonb
                  );
              END IF;
          EXCEPTION WHEN OTHERS THEN
              RAISE WARNING 'Work order creation trigger warning (non-fatal): %', SQLERRM;
          END;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_create_wo_product_order ON product_orders;
      CREATE TRIGGER trg_create_wo_product_order
          AFTER INSERT OR UPDATE ON product_orders
          FOR EACH ROW
          EXECUTE FUNCTION create_wo_from_product_order();
    `

    // Try executing via exec_sql or execute_sql RPC
    let rpcRes = await supabase.rpc("exec_sql" as any, { sql: fixSql })
    if (rpcRes.error) {
      rpcRes = await supabase.rpc("execute_sql" as any, { sql_query: fixSql })
    }

    return NextResponse.json({
      success: !rpcRes.error,
      rpcResult: rpcRes,
      message: rpcRes.error ? "Executed with RPC notice" : "Work order duplicate key constraint fixed successfully!"
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
