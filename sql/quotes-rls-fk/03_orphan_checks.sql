-- Step 3: Orphan checks (read-only). Run and note counts; must be 0 before validation.

-- Product order items without parent order
select 'orphan: product_order_items.order_id' as check, count(*) as rows
from product_order_items i
left join product_orders o on o.id = i.order_id
where o.id is null;

-- Product order items referencing missing product
select 'orphan: product_order_items.product_id' as check, count(*) as rows
from product_order_items i
left join products p on p.id = i.product_id
where p.id is null;

-- Package booking items without parent booking
select 'orphan: package_booking_items.booking_id' as check, count(*) as rows
from package_booking_items i
left join package_bookings b on b.id = i.booking_id
where b.id is null;

-- Package booking items referencing missing package/variant
select 'orphan: package_booking_items.package_id' as check, count(*) as rows
from package_booking_items i
left join package_sets ps on ps.id = i.package_id
where ps.id is null;

select 'orphan: package_booking_items.variant_id' as check, count(*) as rows
from package_booking_items i
left join package_variants v on v.id = i.variant_id
where v.id is null;

-- Optional data quality checks (parents)
select 'bad: product_orders.franchise_id is null' as check, count(*) from product_orders where franchise_id is null;
select 'bad: package_bookings.franchise_id is null' as check, count(*) from package_bookings where franchise_id is null;