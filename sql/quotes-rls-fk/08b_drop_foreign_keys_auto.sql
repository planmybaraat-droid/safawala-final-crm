-- Step 8b: Drop all FK constraints on items tables (Supabase-safe)
-- Use this when DISABLE TRIGGER ALL is not permitted (managed Postgres)

-- Preview constraints that will be dropped
select tc.table_name, tc.constraint_name
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in ('product_order_items','package_booking_items')
order by tc.table_name, tc.constraint_name;

-- Drop them in a loop (idempotent)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    select tc.table_name, tc.constraint_name
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.constraint_type = 'FOREIGN KEY'
      and tc.table_name in ('product_order_items','package_booking_items')
  ) LOOP
    EXECUTE format('alter table %I drop constraint if exists %I', r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- Verify all gone
select tc.table_name, tc.constraint_name
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in ('product_order_items','package_booking_items')
order by tc.table_name, tc.constraint_name;