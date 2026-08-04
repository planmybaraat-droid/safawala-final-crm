-- Step 4: Cleanup templates (copy needed snippets to a new query tab)
-- Use Option A (delete orphans) OR Option B (backfill franchise_id), then re-run 03_orphan_checks.sql

-- Option A: DELETE orphans (recommended)
-- delete from product_order_items i using product_orders o where i.order_id is not null and o.id is null;
-- delete from product_order_items i using products p where i.product_id is not null and p.id is null;
-- delete from package_booking_items i using package_bookings b where i.booking_id is not null and b.id is null;
-- delete from package_booking_items i using package_sets ps where i.package_id is not null and ps.id is null;
-- delete from package_booking_items i using package_variants v where i.variant_id is not null and v.id is null;

-- Option B: BACKFILL missing franchise_id on parents (do this PRIOR to enabling RLS)
-- update product_orders po set franchise_id = u.franchise_id from users u where po.franchise_id is null and po.sales_closed_by_id = u.id;
-- update package_bookings pb set franchise_id = u.franchise_id from users u where pb.franchise_id is null and pb.sales_closed_by_id = u.id;

-- NOTE: If your items tables have a franchise_id column and it's null, you can backfill from parent
-- update product_order_items i set franchise_id = po.franchise_id from product_orders po where i.franchise_id is null and po.id = i.order_id;
-- update package_booking_items i set franchise_id = pb.franchise_id from package_bookings pb where i.franchise_id is null and pb.id = i.booking_id;