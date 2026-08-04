-- Step 2: Add Foreign Keys as NOT VALID (so it won't fail on existing data)
-- Run after indexes

begin;

-- Product orders
alter table product_order_items
  drop constraint if exists fk_poi_order,
  add constraint fk_poi_order
    foreign key (order_id) references product_orders(id)
    on delete cascade
    not valid;

alter table product_order_items
  drop constraint if exists fk_poi_product,
  add constraint fk_poi_product
    foreign key (product_id) references products(id)
    on delete restrict
    not valid;

-- Package bookings
alter table package_booking_items
  drop constraint if exists fk_pbi_booking,
  add constraint fk_pbi_booking
    foreign key (booking_id) references package_bookings(id)
    on delete cascade
    not valid;

alter table package_booking_items
  drop constraint if exists fk_pbi_package,
  add constraint fk_pbi_package
    foreign key (package_id) references package_sets(id)
    on delete restrict
    not valid;

alter table package_booking_items
  drop constraint if exists fk_pbi_variant,
  add constraint fk_pbi_variant
    foreign key (variant_id) references package_variants(id)
    on delete restrict
    not valid;

commit;