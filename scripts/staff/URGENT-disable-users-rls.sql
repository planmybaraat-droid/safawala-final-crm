-- URGENT: Disable RLS on users table
-- This is blocking all staff queries from returning data

-- Check current RLS status
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'users';

-- Disable RLS on users tableRefresh the smoke test page at localhost:3000/test-staff - you should now see 4 staff members
Go to the booking page and the dropdown should work!
Would you like me to guide you through running the SQL script, or would you prefer to run it yourself?
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled (should be false now)"
FROM pg_tables 
WHERE tablename = 'users';

-- Test query to see if staff members are now visible
SELECT id, name, email, role, franchise_id
FROM users
WHERE role IN ('staff', 'franchise_admin')
ORDER BY name;

-- Count total users
SELECT 
  'Total users' as description,
  COUNT(*) as count
FROM users;
