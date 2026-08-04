-- Grant Super Admin Access to Current User
-- This script will make your current user a super admin so you can create franchises

-- Step 1: Check current user's email (run this first to see your email)
SELECT id, email, raw_user_meta_data, raw_app_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Update your user to be a super admin (replace YOUR_EMAIL@example.com with your actual email)
-- Uncomment and modify the email below:

/*
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
WHERE email = 'YOUR_EMAIL@example.com';
*/

-- Example: If your email is admin@safawala.com:
/*
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
WHERE email = 'admin@safawala.com';
*/

-- Step 3: Verify the update
SELECT id, email, 
       raw_user_meta_data ->> 'app_role' as user_meta_role,
       raw_app_meta_data ->> 'app_role' as app_meta_role
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com';

-- Step 4: After running this, SIGN OUT and SIGN IN AGAIN for the changes to take effect
-- The JWT token needs to be refreshed with the new role
