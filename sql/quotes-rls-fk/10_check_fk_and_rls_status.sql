-- Step 10: Check RLS + FK/Trigger status quickly

-- RLS status
select
  t.tablename,
  t.rowsecurity as rls_enabled
from pg_tables t
where t.schemaname = 'public'
  and t.tablename in ('product_orders','product_order_items','package_bookings','package_booking_items')
order by t.tablename;

-- FK constraints present
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name in ('product_order_items','package_booking_items')
  and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name, tc.constraint_name;

-- Triggers enabled/disabled
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('product_order_items','package_booking_items')
order by table_name, trigger_name;
