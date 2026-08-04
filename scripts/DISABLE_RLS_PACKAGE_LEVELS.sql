-- FINAL FIX: Disable RLS for package_levels since you don't use JWT auth
-- Your app handles authorization at the application level

-- Option 1: Completely disable RLS (simplest for API-based auth)
ALTER TABLE package_levels DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'package_levels';

-- If you still want SOME protection, use Option 2 instead:
-- Option 2: Allow all authenticated users (relies on your app's logic)
/*
ALTER TABLE package_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "franchise_select_levels" ON package_levels;
DROP POLICY IF EXISTS "franchise_insert_levels" ON package_levels;
DROP POLICY IF EXISTS "franchise_update_levels" ON package_levels;
DROP POLICY IF EXISTS "franchise_delete_levels" ON package_levels;

CREATE POLICY "allow_all_authenticated"
ON package_levels
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
*/
