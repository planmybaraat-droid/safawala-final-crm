-- ============================================
-- PRODUCTS TABLE RLS POLICIES FOR FRANCHISE ISOLATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: First, ensure RLS is ENABLED
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any (to start fresh)
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

-- Step 3: Create SELECT policy (who can READ products)
-- Logic:
-- 1. Super admins can see ALL products
-- 2. Franchise users can see ONLY their franchise's products
-- 3. Use the service role to bypass RLS when needed
CREATE POLICY "products_select_policy" ON products
FOR SELECT
USING (
  -- Allow if user is super_admin (see all)
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
  OR
  -- Allow if product belongs to user's franchise
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.franchise_id = products.franchise_id
  )
  OR
  -- Allow service role to always access (for backend operations)
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Step 4: Create INSERT policy (who can ADD products)
-- Logic: Only users from the same franchise can add products to their franchise
CREATE POLICY "products_insert_policy" ON products
FOR INSERT
WITH CHECK (
  -- Allow if user is adding product to their own franchise
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.franchise_id = products.franchise_id
  )
  OR
  -- Allow service role
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Step 5: Create UPDATE policy (who can EDIT products)
-- Logic: Only users from the same franchise can edit their products
CREATE POLICY "products_update_policy" ON products
FOR UPDATE
USING (
  -- Can only update if product belongs to user's franchise
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.franchise_id = products.franchise_id
  )
  OR
  -- Allow service role
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
)
WITH CHECK (
  -- Ensure the updated product still belongs to user's franchise
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.franchise_id = products.franchise_id
  )
  OR
  -- Allow service role
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Step 6: Create DELETE policy (who can DELETE products)
-- Logic: Only users from the same franchise can delete their products
CREATE POLICY "products_delete_policy" ON products
FOR DELETE
USING (
  -- Can only delete if product belongs to user's franchise
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.franchise_id = products.franchise_id
  )
  OR
  -- Allow service role
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Step 7: Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

-- Step 8: Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'products';

-- ============================================
-- TESTING
-- ============================================

-- Test 1: Check products visible to mysafawale@gmail.com franchise
SELECT 
    'TEST: mysafawale franchise products' as test,
    COUNT(*) as product_count
FROM products p
JOIN users u ON p.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com';

-- Test 2: List sample products for verification
SELECT 
    'TEST: Sample products' as test,
    p.product_code,
    p.name,
    p.franchise_id,
    u.email as franchise_email
FROM products p
JOIN users u ON p.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
LIMIT 3;
