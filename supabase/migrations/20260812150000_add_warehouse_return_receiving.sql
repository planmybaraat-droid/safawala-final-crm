-- Keep rental work orders open after customer collection until Warehouse has
-- physically received, reconciled, and stored every item.
CREATE SEQUENCE IF NOT EXISTS rr_task_seq START 1;

ALTER TABLE public.work_order_tasks DROP CONSTRAINT IF EXISTS work_order_tasks_department_check;
ALTER TABLE public.work_order_tasks ADD CONSTRAINT work_order_tasks_department_check
  CHECK (department::text = ANY (ARRAY[
    'warehouse','packing','dispatch','event_team','styling','travels',
    'returns','return_receiving','accounts'
  ]::text[]));

