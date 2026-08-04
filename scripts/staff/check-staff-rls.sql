-- Check and fix RLS on users table for staff queries
-- This allows fetching staff members for dropdowns

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- If RLS is enabled and causing issues, disable it
-- (Since you're using service role with cookie auth, RLS isn't needed)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify staff members exist
SELECT id, name, email, role, franchise_id 
FROM users 
WHERE role IN ('staff', 'franchise_admin')
ORDER BY name;

-- Test the exact query used in the booking page
SELECT id, name, email, role, franchise_id 
FROM users 
WHERE role = ANY(ARRAY['staff', 'franchise_admin'])
ORDER BY name;
