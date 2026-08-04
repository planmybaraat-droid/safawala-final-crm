-- Step 1: Helpful indexes (safe/idempotent)
-- Run first

begin;

-- Product orders
create index if not exists idx_product_orders_franchise on product_orders(franchise_id);
create index if not exists idx_product_order_items_order on product_order_items(order_id);
create index if not exists idx_product_order_items_product on product_order_items(product_id);
-- NOTE: Only uncomment if your schema has this column on items
-- create index if not exists idx_product_order_items_franchise on product_order_items(franchise_id);

-- Package bookings
create index if not exists idx_package_bookings_franchise on package_bookings(franchise_id);
create index if not exists idx_package_booking_items_booking on package_booking_items(booking_id);
create index if not exists idx_package_booking_items_package on package_booking_items(package_id);
create index if not exists idx_package_booking_items_variant on package_booking_items(variant_id);
-- NOTE: Only uncomment if your schema has this column on items
-- create index if not exists idx_package_booking_items_franchise on package_booking_items(franchise_id);

commit;