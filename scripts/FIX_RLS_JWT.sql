-- ALTERNATIVE RLS FIX - Using JWT metadata instead of user_profiles join
-- This should work if franchise_id is stored in the JWT token

-- Drop existing policies
DROP POLICY IF EXISTS "Allow franchise users to view their levels" ON package_levels;
DROP POLICY IF EXISTS "Allow franchise users to create their levels" ON package_levels;
DROP POLICY IF EXISTS "Allow franchise users to update their levels" ON package_levels;
DROP POLICY IF EXISTS "Allow franchise users to delete their levels" ON package_levels;

-- Simple SELECT policy using JWT
CREATE POLICY "franchise_select_levels"
ON package_levels
FOR SELECT
TO authenticated
USING (
  franchise_id = (auth.jwt() -> 'user_metadata' ->> 'franchise_id')::uuid
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- Simple INSERT policy using JWT
CREATE POLICY "franchise_insert_levels"
ON package_levels
FOR INSERT
TO authenticated
WITH CHECK (
  franchise_id = (auth.jwt() -> 'user_metadata' ->> 'franchise_id')::uuid
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- Simple UPDATE policy using JWT
CREATE POLICY "franchise_update_levels"
ON package_levels
FOR UPDATE
TO authenticated
USING (
  franchise_id = (auth.jwt() -> 'user_metadata' ->> 'franchise_id')::uuid
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
)
WITH CHECK (
  franchise_id = (auth.jwt() -> 'user_metadata' ->> 'franchise_id')::uuid
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- Simple DELETE policy using JWT
CREATE POLICY "franchise_delete_levels"
ON package_levels
FOR DELETE
TO authenticated
USING (
  franchise_id = (auth.jwt() -> 'user_metadata' ->> 'franchise_id')::uuid
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'package_levels';
