-- Step 5: Validate constraints (run only when orphan counts are all 0)

alter table product_order_items validate constraint fk_poi_order;
alter table product_order_items validate constraint fk_poi_product;
alter table package_booking_items validate constraint fk_pbi_booking;
alter table package_booking_items validate constraint fk_pbi_package;
alter table package_booking_items validate constraint fk_pbi_variant;