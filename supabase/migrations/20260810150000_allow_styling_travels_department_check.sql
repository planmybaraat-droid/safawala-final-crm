-- The styling/travels split (20260809180000) started inserting work_order_tasks
-- rows with department = 'styling' / 'travels', but never widened this CHECK
-- constraint to allow them. Every rental booking confirmation was silently
-- failing (whole UPDATE transaction rolled back) because create_wo_from_product_order()
-- tried to insert a 'styling' task and hit this constraint.
ALTER TABLE work_order_tasks DROP CONSTRAINT work_order_tasks_department_check;
ALTER TABLE work_order_tasks ADD CONSTRAINT work_order_tasks_department_check
  CHECK (department::text = ANY (ARRAY['warehouse','packing','dispatch','event_team','styling','travels','returns','accounts']::text[]));
