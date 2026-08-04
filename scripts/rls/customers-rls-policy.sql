-- ============================================
-- RLS POLICIES FOR CUSTOMERS TABLE
-- Ensures franchise isolation for customers
-- Each franchise can only see their own customers
-- ============================================

-- Step 1: Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON customers;
DROP POLICY IF EXISTS "customers_update_policy" ON customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON customers;

-- Step 3: Create SELECT policy (view customers)
-- Users can only see customers from their own franchise
CREATE POLICY "customers_select_policy" ON customers
    FOR SELECT
    USING (
        -- Super admins can see all customers
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
        OR
        -- Regular users can only see their franchise's customers
        franchise_id IN (
            SELECT franchise_id FROM users WHERE users.id = auth.uid()
        )
    );

-- Step 4: Create INSERT policy (add new customers)
-- Users can only add customers to their own franchise
CREATE POLICY "customers_insert_policy" ON customers
    FOR INSERT
    WITH CHECK (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE users.id = auth.uid()
        )
    );

-- Step 5: Create UPDATE policy (edit customers)
-- Users can only update customers from their own franchise
CREATE POLICY "customers_update_policy" ON customers
    FOR UPDATE
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE users.id = auth.uid()
        )
    )
    WITH CHECK (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE users.id = auth.uid()
        )
    );

-- Step 6: Create DELETE policy (remove customers)
-- Users can only delete customers from their own franchise
CREATE POLICY "customers_delete_policy" ON customers
    FOR DELETE
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE users.id = auth.uid()
        )
    );

-- Step 7: Verify policies are created
SELECT 
    '========== RLS POLICIES CREATED ==========' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'customers'
ORDER BY policyname;

-- Step 8: Verify RLS is enabled
SELECT 
    '========== RLS STATUS ==========' as status,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'customers';

-- Step 9: Test query for mysafawale@gmail.com
-- This should only show customers from this franchise
SELECT 
    '========== TEST: Customers visible to mysafawale@gmail.com ==========' as test,
    COUNT(*) as customer_count
FROM customers
WHERE franchise_id IN (
    SELECT franchise_id FROM users WHERE email = 'mysafawale@gmail.com'
);
