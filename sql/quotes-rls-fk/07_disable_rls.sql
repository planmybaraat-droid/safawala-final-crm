-- Step 7: Temporarily disable RLS (policies remain stored but are ignored)
-- Run this if you want to bypass RLS without touching foreign keys or data

begin;

alter table if exists product_orders disable row level security;
alter table if exists product_order_items disable row level security;
alter table if exists package_bookings disable row level security;
alter table if exists package_booking_items disable row level security;

commit;

-- Optional: If you prefer to remove policies instead of disabling RLS,
-- uncomment the block below (keeps RLS enabled but drops policies).
-- Note: Usually disabling RLS is cleaner for temporary bypass.

-- begin;
-- -- Product orders
-- drop policy if exists "po_select_franchise" on product_orders;
-- drop policy if exists "po_insert_franchise" on product_orders;
-- drop policy if exists "po_update_franchise" on product_orders;
-- drop policy if exists "po_delete_franchise" on product_orders;
-- 
-- -- Product order items
-- drop policy if exists "poi_select_franchise" on product_order_items;
-- drop policy if exists "poi_cud_franchise" on product_order_items;
-- 
-- -- Package bookings
-- drop policy if exists "pb_select_franchise" on package_bookings;
-- drop policy if exists "pb_insert_franchise" on package_bookings;
-- drop policy if exists "pb_update_franchise" on package_bookings;
-- drop policy if exists "pb_delete_franchise" on package_bookings;
-- 
-- -- Package booking items
-- drop policy if exists "pbi_select_franchise" on package_booking_items;
-- drop policy if exists "pbi_cud_franchise" on package_booking_items;
-- commit;

-- Re-enable later with 06_enable_rls_policies.sql or:
-- alter table <table> enable row level security;