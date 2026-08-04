-- DIAGNOSTIC: Check what's actually in your JWT token
-- This will show us EXACTLY what data is available in RLS policies

SELECT 
  auth.uid() as user_id,
  auth.jwt() as full_jwt,
  auth.jwt() -> 'user_metadata' as user_metadata,
  auth.jwt() -> 'user_metadata' ->> 'franchise_id' as franchise_from_metadata,
  auth.jwt() -> 'user_metadata' ->> 'role' as role_from_metadata,
  auth.jwt() ->> 'role' as role_from_jwt_root,
  auth.jwt() -> 'app_metadata' as app_metadata,
  auth.jwt() -> 'app_metadata' ->> 'franchise_id' as franchise_from_app_metadata;

-- If the above shows NULL for franchise_id, we need to use a different approach:
-- Check if user_profiles has the data
SELECT 
  id,
  franchise_id,
  role
FROM user_profiles
WHERE id = auth.uid();
