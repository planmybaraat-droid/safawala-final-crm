-- Check franchises and super admin status

-- 1. Show all franchises
SELECT 
    '🏢 FRANCHISES' as section,
    id,
    code,
    name,
    city,
    created_at
FROM franchises
ORDER BY code;

-- 2. Check super admin user
SELECT 
    '👤 SUPER ADMIN USER' as section,
    id,
    email,
    created_at
FROM auth.users
WHERE email LIKE '%super%' OR email LIKE '%admin%'
ORDER BY created_at
LIMIT 5;

-- 3. Check user profiles
SELECT 
    '👥 USER PROFILES' as section,
    up.id,
    up.email,
    up.role,
    up.franchise_id,
    f.code as franchise_code,
    f.name as franchise_name
FROM user_profiles up
LEFT JOIN franchises f ON f.id = up.franchise_id
WHERE up.role = 'super_admin' OR up.email LIKE '%admin%'
ORDER BY up.created_at;

-- 4. Check if HQ franchise exists
SELECT 
    '🏛️ HQ FRANCHISE CHECK' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM franchises WHERE code = 'HQ001') 
        THEN '✅ HQ001 franchise exists'
        ELSE '❌ HQ001 franchise NOT found'
    END as hq_status;
