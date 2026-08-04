-- Find super admin user

-- Check user_profiles for super admin
SELECT 
    id,
    email,
    role,
    franchise_id
FROM user_profiles
WHERE role = 'super_admin'
ORDER BY created_at;
