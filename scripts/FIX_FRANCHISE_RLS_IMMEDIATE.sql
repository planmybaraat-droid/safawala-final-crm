-- IMMEDIATE FIX FOR FRANCHISE CREATION RLS ISSUE
-- This script will update your user's auth metadata to grant super admin access

-- STEP 1: Find your current user
-- Run this first to see your user details:
SELECT 
    id,
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    raw_user_meta_data->>'app_role' as user_meta_role,
    raw_app_meta_data->>'app_role' as app_meta_role
FROM auth.users
WHERE email = 'vardaan@gmail.com';

-- STEP 2: Update your user to have super_admin role in BOTH metadata fields
-- This is what the RLS policy checks
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{app_role}',
    '"super_admin"'
  ),
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{app_role}',
    '"super_admin"'
  )
WHERE email = 'vardaan@gmail.com';

-- STEP 3: Verify the update worked
SELECT 
    id,
    email,
    raw_user_meta_data->>'app_role' as user_meta_role,
    raw_app_meta_data->>'app_role' as app_meta_role
FROM auth.users
WHERE email = 'vardaan@gmail.com';

-- Expected result:
-- user_meta_role: super_admin
-- app_meta_role: super_admin

-- STEP 4: Check the RLS function to confirm what it's looking for
SELECT pg_get_functiondef('app_is_super_admin'::regproc);

-- AFTER RUNNING THIS:
-- 1. Go to your browser
-- 2. SIGN OUT completely
-- 3. SIGN IN again (this refreshes your JWT token with the new metadata)
-- 4. Try creating the franchise again

-- OPTIONAL: If you want to temporarily bypass RLS for testing (NOT RECOMMENDED FOR PRODUCTION)
-- Uncomment the following lines ONLY for testing:

/*
-- Temporarily disable RLS on franchises table (TESTING ONLY)
ALTER TABLE franchises DISABLE ROW LEVEL SECURITY;

-- To re-enable it after testing:
-- ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
*/

-- ALTERNATIVE: Create a more permissive policy for super_admin users
-- This adds an additional policy that explicitly allows super_admin role from profiles table

DROP POLICY IF EXISTS franchises_insert_super_admin_profile ON franchises;

CREATE POLICY franchises_insert_super_admin_profile ON franchises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- This policy will allow INSERT if either:
-- 1. The JWT token has app_role = 'super_admin' (checked by existing policy)
-- 2. The user's profile has role = 'super_admin' (checked by this new policy)
