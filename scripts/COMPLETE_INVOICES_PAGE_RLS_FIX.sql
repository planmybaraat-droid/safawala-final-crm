-- COMPLETE FIX FOR INVOICES PAGE - FRANCHISE ISOLATION
-- This single script fixes everything the invoices page needs

-- ============================================================================
-- INVOICES TABLE (actual invoice records)
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_all_invoices" ON invoices;
DROP POLICY IF EXISTS "franchise_users_own_invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their franchise invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage their franchise invoices" ON invoices;
DROP POLICY IF EXISTS "Allow all operations on invoices" ON invoices;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_invoices" ON invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

CREATE POLICY "franchise_users_own_invoices" ON invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = invoices.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PRODUCT_ORDERS TABLE (rental/sale orders shown as invoices)
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_all_product_orders" ON product_orders;
DROP POLICY IF EXISTS "franchise_users_own_product_orders" ON product_orders;

ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_product_orders" ON product_orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

CREATE POLICY "franchise_users_own_product_orders" ON product_orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = product_orders.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PRODUCT_ORDER_ITEMS TABLE (items in orders)
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_all_product_order_items" ON product_order_items;
DROP POLICY IF EXISTS "franchise_users_own_product_order_items" ON product_order_items;

ALTER TABLE product_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_product_order_items" ON product_order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

CREATE POLICY "franchise_users_own_product_order_items" ON product_order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM product_orders
    JOIN users ON users.id = auth.uid()
    WHERE product_orders.id = product_order_items.order_id
    AND users.franchise_id = product_orders.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PACKAGE_BOOKINGS TABLE (package bookings shown as invoices)
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_all_package_bookings" ON package_bookings;
DROP POLICY IF EXISTS "franchise_users_own_package_bookings" ON package_bookings;

ALTER TABLE package_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_package_bookings" ON package_bookings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

CREATE POLICY "franchise_users_own_package_bookings" ON package_bookings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = package_bookings.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PACKAGE_BOOKING_ITEMS TABLE (items in bookings)
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_all_package_booking_items" ON package_booking_items;
DROP POLICY IF EXISTS "franchise_users_own_package_booking_items" ON package_booking_items;

ALTER TABLE package_booking_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_package_booking_items" ON package_booking_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

CREATE POLICY "franchise_users_own_package_booking_items" ON package_booking_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM package_bookings
    JOIN users ON users.id = auth.uid()
    WHERE package_bookings.id = package_booking_items.booking_id
    AND users.franchise_id = package_bookings.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- CUSTOMERS TABLE (customer names shown in invoices)
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_all_customers" ON customers;
DROP POLICY IF EXISTS "franchise_users_own_customers" ON customers;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_customers" ON customers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

CREATE POLICY "franchise_users_own_customers" ON customers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = customers.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE tablename IN (
    'invoices', 
    'product_orders', 
    'product_order_items',
    'package_bookings', 
    'package_booking_items',
    'customers'
)
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have 2 policies

SELECT '✅ INVOICES PAGE IS NOW FULLY FRANCHISE-ISOLATED' AS status;
