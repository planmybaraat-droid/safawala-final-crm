-- Step 3b: Orphan checks (single table output)
-- Run this to see ALL counts in one result set

select * from (
  select 'orphan: product_order_items.order_id' as check, count(*)::bigint as rows
  from product_order_items i
  left join product_orders o on o.id = i.order_id
  where o.id is null

  union all

  select 'orphan: product_order_items.product_id' as check, count(*)::bigint as rows
  from product_order_items i
  left join products p on p.id = i.product_id
  where p.id is null

  union all

  select 'orphan: package_booking_items.booking_id' as check, count(*)::bigint as rows
  from package_booking_items i
  left join package_bookings b on b.id = i.booking_id
  where b.id is null

  union all

  select 'orphan: package_booking_items.package_id' as check, count(*)::bigint as rows
  from package_booking_items i
  left join package_sets ps on ps.id = i.package_id
  where ps.id is null

  union all

  select 'orphan: package_booking_items.variant_id' as check, count(*)::bigint as rows
  from package_booking_items i
  left join package_variants v on v.id = i.variant_id
  where v.id is null

  union all

  select 'bad: product_orders.franchise_id is null' as check, count(*)::bigint as rows
  from product_orders where franchise_id is null

  union all

  select 'bad: package_bookings.franchise_id is null' as check, count(*)::bigint as rows
  from package_bookings where franchise_id is null
) t
order by check;