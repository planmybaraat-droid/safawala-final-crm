-- FIX PACKAGE VARIANTS RLS FOR FRANCHISE ISOLATION (NO LEVELS)
-- Issue: Variants visibility inconsistent due to legacy level-based checks
-- Solution: Remove package_levels references entirely; scope by package_variants only

-- Step 1: Drop old/incorrect policies
DROP POLICY IF EXISTS "super_admin_full_access_package_variants" ON package_variants;
DROP POLICY IF EXISTS "franchise_users_own_package_variants" ON package_variants;
DROP POLICY IF EXISTS "Allow all operations on package_variants" ON package_variants;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON package_variants;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON package_variants;
DROP POLICY IF EXISTS "Users can view package_variants" ON package_variants;
DROP POLICY IF EXISTS "Users can manage package_variants" ON package_variants;

-- Step 2: Enable RLS
ALTER TABLE package_variants ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper franchise-isolated policies

-- Policy 1: Super admins see all variants
CREATE POLICY "super_admin_all_package_variants" ON package_variants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise admins/staff see only their franchise's variants
CREATE POLICY "franchise_users_own_package_variants" ON package_variants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = package_variants.franchise_id
    AND users.is_active = true
  )
);

-- Step 4: Distance pricing — variant-based only (no levels)
-- Ensure column exists
ALTER TABLE distance_pricing
  ADD COLUMN IF NOT EXISTS package_variant_id uuid REFERENCES package_variants(id) ON DELETE CASCADE;

-- Drop any legacy policies
DROP POLICY IF EXISTS "super_admin_all_distance_pricing" ON distance_pricing;
DROP POLICY IF EXISTS "franchise_users_own_distance_pricing" ON distance_pricing;

-- Enable RLS
ALTER TABLE distance_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: super-admins see all rows
CREATE POLICY "super_admin_all_distance_pricing" ON distance_pricing
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy: franchise users see rows tied to variants in their franchise
CREATE POLICY "franchise_users_own_distance_pricing" ON distance_pricing
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM package_variants
    JOIN users ON users.id = auth.uid()
    WHERE package_variants.id = distance_pricing.package_variant_id
      AND users.franchise_id = package_variants.franchise_id
      AND users.is_active = true
  )
);

-- Step 5: Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('package_variants', 'distance_pricing')
ORDER BY tablename, policyname;

-- Expected result: 
-- package_variants: 2 policies (super_admin_all, franchise_users_own)
-- distance_pricing: 2 policies (super_admin_all, franchise_users_own)
