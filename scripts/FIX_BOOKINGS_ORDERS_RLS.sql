-- FIX RLS FOR BOOKINGS AND ORDERS - FRANCHISE ISOLATION
-- Ensures product_orders, package_bookings, and their items are franchise-isolated

-- ============================================================================
-- PART 1: PRODUCT_ORDERS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_product_orders" ON product_orders;
DROP POLICY IF EXISTS "franchise_users_own_product_orders" ON product_orders;

-- Enable RLS
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all product orders
CREATE POLICY "super_admin_all_product_orders" ON product_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's product orders
CREATE POLICY "franchise_users_own_product_orders" ON product_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = product_orders.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PART 2: PRODUCT_ORDER_ITEMS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_product_order_items" ON product_order_items;
DROP POLICY IF EXISTS "franchise_users_own_product_order_items" ON product_order_items;

-- Enable RLS
ALTER TABLE product_order_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all product order items
CREATE POLICY "super_admin_all_product_order_items" ON product_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's product order items
CREATE POLICY "franchise_users_own_product_order_items" ON product_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM product_orders
    JOIN users ON users.id = auth.uid()
    WHERE product_orders.id = product_order_items.product_order_id
    AND users.franchise_id = product_orders.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PART 3: PACKAGE_BOOKINGS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_package_bookings" ON package_bookings;
DROP POLICY IF EXISTS "franchise_users_own_package_bookings" ON package_bookings;

-- Enable RLS
ALTER TABLE package_bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all package bookings
CREATE POLICY "super_admin_all_package_bookings" ON package_bookings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's package bookings
CREATE POLICY "franchise_users_own_package_bookings" ON package_bookings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = package_bookings.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PART 4: PACKAGE_BOOKING_ITEMS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_package_booking_items" ON package_booking_items;
DROP POLICY IF EXISTS "franchise_users_own_package_booking_items" ON package_booking_items;

-- Enable RLS
ALTER TABLE package_booking_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all package booking items
CREATE POLICY "super_admin_all_package_booking_items" ON package_booking_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's package booking items
CREATE POLICY "franchise_users_own_package_booking_items" ON package_booking_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM package_bookings
    JOIN users ON users.id = auth.uid()
    WHERE package_bookings.id = package_booking_items.package_booking_id
    AND users.franchise_id = package_bookings.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('product_orders', 'product_order_items', 'package_bookings', 'package_booking_items')
ORDER BY tablename, policyname;

-- Expected result: 2 policies per table (super_admin_all, franchise_users_own)

SELECT '✅ BOOKINGS AND ORDERS ARE NOW FRANCHISE-ISOLATED' AS status;
