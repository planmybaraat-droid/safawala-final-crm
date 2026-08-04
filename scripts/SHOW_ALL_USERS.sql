-- Find all users

-- Check all user_profiles
SELECT 
    id,
    email,
    role,
    franchise_id,
    created_at
FROM user_profiles
ORDER BY created_at
LIMIT 10;
