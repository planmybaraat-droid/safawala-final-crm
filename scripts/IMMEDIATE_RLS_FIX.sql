-- IMMEDIATE FRANCHISE ISOLATION FIX
-- Run this NOW in Supabase SQL Editor to enforce data isolation
-- This combines all RLS policies into one script for quick execution

-- Step 1: Create helper functions for RLS
CREATE OR REPLACE FUNCTION jwt_franchise_id()
RETURNS uuid STABLE LANGUAGE sql AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'franchise_id', '')::uuid,
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'franchise_id'), '')::uuid
  )
$$;

CREATE OR REPLACE FUNCTION app_is_super_admin()
RETURNS boolean STABLE LANGUAGE sql AS $$
  SELECT (auth.jwt() ->> 'app_role') = 'super_admin'
         OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'super_admin';
$$;

-- Step 2: Enable RLS on all tenant tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Enable for laundry if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'laundry_batches') THEN
    EXECUTE 'ALTER TABLE laundry_batches ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'laundry_batch_items') THEN
    EXECUTE 'ALTER TABLE laundry_batch_items ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'laundry_items') THEN
    EXECUTE 'ALTER TABLE laundry_items ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Enable for deliveries if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'deliveries') THEN
    EXECUTE 'ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Step 3: Drop any overly permissive policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname ILIKE '%Enable all%' OR policyname ILIKE '%authenticated users%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END $$;

-- Step 4: Create strict tenant policies for CUSTOMERS
DROP POLICY IF EXISTS customers_select ON customers;
DROP POLICY IF EXISTS customers_insert ON customers;
DROP POLICY IF EXISTS customers_update ON customers;
DROP POLICY IF EXISTS customers_delete ON customers;

CREATE POLICY customers_select ON customers FOR SELECT
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY customers_update ON customers FOR UPDATE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY customers_delete ON customers FOR DELETE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

-- Step 5: Create strict tenant policies for PRODUCTS
DROP POLICY IF EXISTS products_select ON products;
DROP POLICY IF EXISTS products_insert ON products;
DROP POLICY IF EXISTS products_update ON products;
DROP POLICY IF EXISTS products_delete ON products;

CREATE POLICY products_select ON products FOR SELECT
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY products_insert ON products FOR INSERT
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY products_update ON products FOR UPDATE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY products_delete ON products FOR DELETE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

-- Step 6: Create strict tenant policies for BOOKINGS
DROP POLICY IF EXISTS bookings_select ON bookings;
DROP POLICY IF EXISTS bookings_insert ON bookings;
DROP POLICY IF EXISTS bookings_update ON bookings;
DROP POLICY IF EXISTS bookings_delete ON bookings;

CREATE POLICY bookings_select ON bookings FOR SELECT
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY bookings_insert ON bookings FOR INSERT
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY bookings_update ON bookings FOR UPDATE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY bookings_delete ON bookings FOR DELETE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

-- Step 7: BOOKING_ITEMS via booking
DROP POLICY IF EXISTS booking_items_select ON booking_items;
DROP POLICY IF EXISTS booking_items_insert ON booking_items;
DROP POLICY IF EXISTS booking_items_update ON booking_items;
DROP POLICY IF EXISTS booking_items_delete ON booking_items;

CREATE POLICY booking_items_select ON booking_items FOR SELECT
  USING (app_is_super_admin() OR EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
  ));

CREATE POLICY booking_items_insert ON booking_items FOR INSERT
  WITH CHECK (app_is_super_admin() OR EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
  ));

CREATE POLICY booking_items_update ON booking_items FOR UPDATE
  USING (app_is_super_admin() OR EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
  ))
  WITH CHECK (app_is_super_admin() OR EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
  ));

CREATE POLICY booking_items_delete ON booking_items FOR DELETE
  USING (app_is_super_admin() OR EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
  ));

-- Step 8: PURCHASES
DROP POLICY IF EXISTS purchases_select ON purchases;
DROP POLICY IF EXISTS purchases_insert ON purchases;
DROP POLICY IF EXISTS purchases_update ON purchases;
DROP POLICY IF EXISTS purchases_delete ON purchases;

CREATE POLICY purchases_select ON purchases FOR SELECT
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY purchases_insert ON purchases FOR INSERT
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY purchases_update ON purchases FOR UPDATE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY purchases_delete ON purchases FOR DELETE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

-- Step 9: EXPENSES
DROP POLICY IF EXISTS expenses_select ON expenses;
DROP POLICY IF EXISTS expenses_insert ON expenses;
DROP POLICY IF EXISTS expenses_update ON expenses;
DROP POLICY IF EXISTS expenses_delete ON expenses;

CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY expenses_update ON expenses FOR UPDATE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY expenses_delete ON expenses FOR DELETE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

-- Step 10: USERS (tenant scoped)
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_delete ON users;

CREATE POLICY users_select ON users FOR SELECT
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY users_update ON users FOR UPDATE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
  WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id());

CREATE POLICY users_delete ON users FOR DELETE
  USING (app_is_super_admin() OR franchise_id = jwt_franchise_id());

-- Step 11: FRANCHISES (tenants see only their own)
DROP POLICY IF EXISTS franchises_select ON franchises;
DROP POLICY IF EXISTS franchises_insert ON franchises;
DROP POLICY IF EXISTS franchises_update ON franchises;
DROP POLICY IF EXISTS franchises_delete ON franchises;

CREATE POLICY franchises_select ON franchises FOR SELECT
  USING (app_is_super_admin() OR id = jwt_franchise_id());

CREATE POLICY franchises_insert ON franchises FOR INSERT
  WITH CHECK (app_is_super_admin());

CREATE POLICY franchises_update ON franchises FOR UPDATE
  USING (app_is_super_admin())
  WITH CHECK (app_is_super_admin());

CREATE POLICY franchises_delete ON franchises FOR DELETE
  USING (app_is_super_admin());

-- Step 12: VENDORS (shared catalog, admin writes)
DROP POLICY IF EXISTS vendors_select ON vendors;
DROP POLICY IF EXISTS vendors_insert ON vendors;
DROP POLICY IF EXISTS vendors_update ON vendors;
DROP POLICY IF EXISTS vendors_delete ON vendors;

CREATE POLICY vendors_select ON vendors FOR SELECT
  USING (true); -- All authenticated can read

CREATE POLICY vendors_insert ON vendors FOR INSERT
  WITH CHECK (app_is_super_admin());

CREATE POLICY vendors_update ON vendors FOR UPDATE
  USING (app_is_super_admin())
  WITH CHECK (app_is_super_admin());

CREATE POLICY vendors_delete ON vendors FOR DELETE
  USING (app_is_super_admin());

-- Step 13: Verification query
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  bool_and(attname IS NOT NULL) as has_franchise_id_column
FROM pg_policies p
LEFT JOIN pg_class c ON c.relname = p.tablename
LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'franchise_id'
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products', 'bookings', 'purchases', 'expenses', 'users', 'franchises', 'vendors')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS POLICIES APPLIED SUCCESSFULLY';
  RAISE NOTICE '==================================';
  RAISE NOTICE 'All tenant tables now enforce franchise isolation.';
  RAISE NOTICE 'Each franchise admin will see ONLY their own data.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: The client app must now pass franchise_id in ALL queries.';
  RAISE NOTICE 'I will update the frontend code next.';
END $$;
