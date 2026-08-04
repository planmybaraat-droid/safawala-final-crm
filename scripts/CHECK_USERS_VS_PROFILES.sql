-- Check users table vs user_profiles table

-- 1. Check users table
SELECT 
    'USERS TABLE' as section,
    id,
    email,
    name,
    role,
    franchise_id,
    is_active
FROM users
WHERE email = 'vardaanbhai@gmail.com';

-- 2. Check user_profiles table
SELECT 
    'USER_PROFILES TABLE' as section,
    id,
    email,
    first_name,
    last_name,
    role,
    franchise_id
FROM user_profiles
WHERE email = 'vardaanbhai@gmail.com';

-- 3. Check if both tables exist
SELECT 
    'TABLE EXISTS CHECK' as section,
    table_name,
    'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'user_profiles')
ORDER BY table_name;
