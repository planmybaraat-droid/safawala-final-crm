-- Nothing in the codebase ever created a work_orders row — the entire Pick
-- & Pack feature (warehouse/packing/dispatch/event_team/returns/accounts
-- tasks, print slips, RBAC-filtered views) was fully built but never fed
-- data, so it always showed "No tasks found". 87 work orders existed only
-- because someone hand-seeded them once, using this exact task template.
--
-- Sequences continue from the highest number already in use at the time
-- this was written (87 work orders, 25 of them rentals with event_team/
-- returns tasks). If re-running this migration on a database with more
-- rows already present, bump these setval calls to match first.
create sequence if not exists work_order_number_seq;
create sequence if not exists wh_task_seq;
create sequence if not exists pk_task_seq;
create sequence if not exists dp_task_seq;
create sequence if not exists ev_task_seq;
create sequence if not exists rt_task_seq;
create sequence if not exists ac_task_seq;

select setval('work_order_number_seq', greatest((select coalesce(max(nullif(regexp_replace(work_order_number, '\D', '', 'g'), '')::int), 0) from public.work_orders), 87));
select setval('wh_task_seq', greatest((select coalesce(max(nullif(regexp_replace(task_number, '\D', '', 'g'), '')::int), 0) from public.work_order_tasks where department = 'warehouse'), 87));
select setval('pk_task_seq', greatest((select coalesce(max(nullif(regexp_replace(task_number, '\D', '', 'g'), '')::int), 0) from public.work_order_tasks where department = 'packing'), 87));
select setval('dp_task_seq', greatest((select coalesce(max(nullif(regexp_replace(task_number, '\D', '', 'g'), '')::int), 0) from public.work_order_tasks where department = 'dispatch'), 87));
select setval('ac_task_seq', greatest((select coalesce(max(nullif(regexp_replace(task_number, '\D', '', 'g'), '')::int), 0) from public.work_order_tasks where department = 'accounts'), 87));
select setval('ev_task_seq', greatest((select coalesce(max(nullif(regexp_replace(task_number, '\D', '', 'g'), '')::int), 0) from public.work_order_tasks where department = 'event_team'), 25));
select setval('rt_task_seq', greatest((select coalesce(max(nullif(regexp_replace(task_number, '\D', '', 'g'), '')::int), 0) from public.work_order_tasks where department = 'returns'), 25));

-- Single source of truth for work-order creation, used by both
-- POST/PUT /api/orders (live bookings) and a one-time backfill for
-- pre-existing confirmed orders — idempotent (safe to call twice for the
-- same booking; no-ops and returns the existing id) and matches the exact
-- task template already established by the hand-seeded work orders.
-- Rentals get all 6 tasks (warehouse/packing/dispatch/event_team/returns/
-- accounts); sales skip event_team/returns since there's no return leg.
create or replace function public.create_work_order_for_booking(
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
  returning id into v_wo_id;

  select coalesce(
    string_agg(format('%s x %s', (item->>'quantity'), (item->>'product_name')), E'\n'),
    'No items added to order items list.'
  ) into v_instructions
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

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

  return v_wo_id;
end;
$$;

revoke all on function public.create_work_order_for_booking(uuid,text,uuid,text,boolean,jsonb) from public;
grant execute on function public.create_work_order_for_booking(uuid,text,uuid,text,boolean,jsonb) to authenticated, service_role;
