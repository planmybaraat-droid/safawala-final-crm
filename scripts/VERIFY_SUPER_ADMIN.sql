-- Verify super admin setup and roles

-- 1. Check all super admins
SELECT 
    '👑 SUPER ADMINS' as section,
    id,
    email,
    role,
    franchise_id,
    first_name,
    last_name
FROM user_profiles
WHERE role = 'super_admin'
ORDER BY created_at;

-- 2. Check all franchise admins
SELECT 
    '👔 FRANCHISE ADMINS' as section,
    id,
    email,
    role,
    franchise_id,
    first_name,
    last_name
FROM user_profiles
WHERE role = 'franchise_admin'
ORDER BY created_at;

-- 3. Check all admin role users
SELECT 
    '👨‍💼 REGULAR ADMINS' as section,
    id,
    email,
    role,
    franchise_id,
    first_name,
    last_name
FROM user_profiles
WHERE role = 'admin'
ORDER BY created_at;

-- 4. Verify vardaanbhai specifically
SELECT 
    '✅ VARDAAN STATUS' as section,
    id,
    email,
    role,
    franchise_id,
    first_name,
    last_name
FROM user_profiles
WHERE email = 'vardaanbhai@gmail.com';
