-- Enable RLS on users table with franchise isolation
-- This allows each franchise to see only their own staff members

-- Step 1: Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- Step 3: Create policy for SELECT operations
-- Super admins can see all users
-- Others can only see users from their own franchise
CREATE POLICY "users_select_policy" ON users
FOR SELECT
USING (
  -- Allow if user is super_admin (can see all)
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'super_admin'
  )
  OR
  -- Allow if viewing users from same franchise
  franchise_id = (
    SELECT franchise_id FROM users
    WHERE id = auth.uid()
  )
);

-- Step 4: Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';

-- Step 5: Test query
-- This should only return users from the current user's franchise
SELECT 
  id, 
  name, 
  email, 
  role, 
  franchise_id
FROM users
WHERE role IN ('staff', 'franchise_admin')
ORDER BY name;
