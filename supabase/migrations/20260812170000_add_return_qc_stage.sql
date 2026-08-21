-- Returned rentals must pass QC before Warehouse can receive and store them.
ALTER TABLE public.work_order_tasks DROP CONSTRAINT IF EXISTS work_order_tasks_department_check;
ALTER TABLE public.work_order_tasks ADD CONSTRAINT work_order_tasks_department_check
  CHECK (department::text = ANY (ARRAY[
    'warehouse','packing','dispatch','event_team','styling','travels',
    'returns','return_qc','return_receiving','accounts'
  ]::text[]));

