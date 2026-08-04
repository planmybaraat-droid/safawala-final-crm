-- Step 6: Enable RLS + franchise-based policies
-- Uses join-to-parent approach (items don’t need franchise_id column)

-- Product Orders
alter table product_orders enable row level security;

drop policy if exists "po_select_franchise" on product_orders;
drop policy if exists "po_insert_franchise" on product_orders;
drop policy if exists "po_update_franchise" on product_orders;
drop policy if exists "po_delete_franchise" on product_orders;

create policy "po_select_franchise" on product_orders
  for select to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = product_orders.franchise_id
    ))
  );

create policy "po_insert_franchise" on product_orders
  for insert to authenticated
  with check (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = product_orders.franchise_id
    ))
  );

create policy "po_update_franchise" on product_orders
  for update to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = product_orders.franchise_id
    ))
  )
  with check (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = product_orders.franchise_id
    ))
  );

create policy "po_delete_franchise" on product_orders
  for delete to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = product_orders.franchise_id
    ))
  );

-- Product Order Items (derive franchise from parent)
alter table product_order_items enable row level security;

drop policy if exists "poi_select_franchise" on product_order_items;
drop policy if exists "poi_cud_franchise" on product_order_items;

create policy "poi_select_franchise" on product_order_items
  for select to authenticated
  using (
    exists (
      select 1
      from users u
      join product_orders po on po.id = product_order_items.order_id
      where u.id = auth.uid()
        and (u.role = 'super_admin' or u.franchise_id = po.franchise_id)
    )
  );

create policy "poi_cud_franchise" on product_order_items
  for all to authenticated
  using (
    exists (
      select 1
      from users u
      join product_orders po on po.id = product_order_items.order_id
      where u.id = auth.uid()
        and (u.role = 'super_admin' or u.franchise_id = po.franchise_id)
    )
  )
  with check (
    exists (
      select 1
      from users u
      join product_orders po on po.id = product_order_items.order_id
      where u.id = auth.uid()
        and (u.role = 'super_admin' or u.franchise_id = po.franchise_id)
    )
  );

-- Package Bookings
alter table package_bookings enable row level security;

drop policy if exists "pb_select_franchise" on package_bookings;
drop policy if exists "pb_insert_franchise" on package_bookings;
drop policy if exists "pb_update_franchise" on package_bookings;
drop policy if exists "pb_delete_franchise" on package_bookings;

create policy "pb_select_franchise" on package_bookings
  for select to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = package_bookings.franchise_id
    ))
  );

create policy "pb_insert_franchise" on package_bookings
  for insert to authenticated
  with check (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = package_bookings.franchise_id
    ))
  );

create policy "pb_update_franchise" on package_bookings
  for update to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = package_bookings.franchise_id
    ))
  )
  with check (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = package_bookings.franchise_id
    ))
  );

create policy "pb_delete_franchise" on package_bookings
  for delete to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and (
      u.role = 'super_admin' or u.franchise_id = package_bookings.franchise_id
    ))
  );

-- Package Booking Items (derive franchise from parent)
alter table package_booking_items enable row level security;

drop policy if exists "pbi_select_franchise" on package_booking_items;
drop policy if exists "pbi_cud_franchise" on package_booking_items;

create policy "pbi_select_franchise" on package_booking_items
  for select to authenticated
  using (
    exists (
      select 1
      from users u
      join package_bookings pb on pb.id = package_booking_items.booking_id
      where u.id = auth.uid()
        and (u.role = 'super_admin' or u.franchise_id = pb.franchise_id)
    )
  );

create policy "pbi_cud_franchise" on package_booking_items
  for all to authenticated
  using (
    exists (
      select 1
      from users u
      join package_bookings pb on pb.id = package_booking_items.booking_id
      where u.id = auth.uid()
        and (u.role = 'super_admin' or u.franchise_id = pb.franchise_id)
    )
  )
  with check (
    exists (
      select 1
      from users u
      join package_bookings pb on pb.id = package_booking_items.booking_id
      where u.id = auth.uid()
        and (u.role = 'super_admin' or u.franchise_id = pb.franchise_id)
    )
  );