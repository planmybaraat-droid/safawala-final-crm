-- FIX RLS FOR INVOICES, DELIVERIES, AND RETURNS - FRANCHISE ISOLATION
-- This script ensures franchise admins only see their own data

-- ============================================================================
-- PART 1: INVOICES TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_invoices" ON invoices;
DROP POLICY IF EXISTS "franchise_users_own_invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their franchise invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage their franchise invoices" ON invoices;
DROP POLICY IF EXISTS "Allow all operations on invoices" ON invoices;

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all invoices
CREATE POLICY "super_admin_all_invoices" ON invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's invoices
CREATE POLICY "franchise_users_own_invoices" ON invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = invoices.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PART 2: DELIVERIES TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_deliveries" ON deliveries;
DROP POLICY IF EXISTS "franchise_users_own_deliveries" ON deliveries;
DROP POLICY IF EXISTS "Users can view their franchise deliveries" ON deliveries;
DROP POLICY IF EXISTS "Users can manage their franchise deliveries" ON deliveries;
DROP POLICY IF EXISTS "Allow all operations on deliveries" ON deliveries;

-- Enable RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all deliveries
CREATE POLICY "super_admin_all_deliveries" ON deliveries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's deliveries
CREATE POLICY "franchise_users_own_deliveries" ON deliveries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = deliveries.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PART 3: RETURNS TABLE
-- ============================================================================

-- Check if returns table has franchise_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'franchise_id'
  ) THEN
    -- Add franchise_id column if missing
    ALTER TABLE returns ADD COLUMN franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE;
    
    -- Populate franchise_id from deliveries table
    UPDATE returns r
    SET franchise_id = d.franchise_id
    FROM deliveries d
    WHERE r.delivery_id = d.id
    AND r.franchise_id IS NULL;
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_returns_franchise_id ON returns(franchise_id);
  END IF;
END $$;

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_returns" ON returns;
DROP POLICY IF EXISTS "franchise_users_own_returns" ON returns;
DROP POLICY IF EXISTS "Users can view their franchise returns" ON returns;
DROP POLICY IF EXISTS "Users can manage their franchise returns" ON returns;
DROP POLICY IF EXISTS "Allow all operations on returns" ON returns;

-- Enable RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all returns
CREATE POLICY "super_admin_all_returns" ON returns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's returns
CREATE POLICY "franchise_users_own_returns" ON returns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = returns.franchise_id
    AND users.is_active = true
  )
);

-- ============================================================================
-- PART 4: RETURN_ITEMS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_return_items" ON return_items;
DROP POLICY IF EXISTS "franchise_users_own_return_items" ON return_items;

-- Enable RLS
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins see all return_items
CREATE POLICY "super_admin_all_return_items" ON return_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's return_items (via returns table)
CREATE POLICY "franchise_users_own_return_items" ON return_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM returns
    JOIN users ON users.id = auth.uid()
    WHERE returns.id = return_items.return_id
    AND users.franchise_id = returns.franchise_id
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
WHERE tablename IN ('invoices', 'deliveries', 'returns', 'return_items')
ORDER BY tablename, policyname;

-- Expected result: 2 policies per table (super_admin_all, franchise_users_own)

-- Verify column existence
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('invoices', 'deliveries', 'returns')
AND column_name = 'franchise_id'
ORDER BY table_name;

-- Expected result: 3 rows (one for each table)

SELECT 'RLS FRANCHISE ISOLATION COMPLETE FOR INVOICES, DELIVERIES, RETURNS, AND RETURN_ITEMS' AS status;
