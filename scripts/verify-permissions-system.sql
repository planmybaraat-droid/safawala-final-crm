-- Verify the permissions system is working correctly

-- Check if users table exists with correct structure
SELECT 
    'Users table structure' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'permissions' 
            AND data_type = 'jsonb'
        ) THEN 'PASS - Users table has permissions column'
        ELSE 'FAIL - Users table missing permissions column'
    END as result;

-- Check if role constraint is correct
SELECT 
    'Role constraint check' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.check_constraints cc
            JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
            WHERE ccu.table_name = 'users' 
            AND ccu.column_name = 'role'
            AND cc.check_clause LIKE '%super_admin%'
            AND cc.check_clause LIKE '%franchise_admin%'
            AND cc.check_clause LIKE '%staff%'
            AND cc.check_clause LIKE '%readonly%'
        ) THEN 'PASS - Role constraint includes all required roles'
        ELSE 'FAIL - Role constraint missing or incorrect'
    END as result;

-- Check if sample users were created
SELECT 
    'Sample users check' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM users) >= 5 THEN 'PASS - Sample users created'
        ELSE 'FAIL - Not enough sample users'
    END as result;

-- Check if permissions are properly set
SELECT 
    'Permissions structure check' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM users 
            WHERE permissions ? 'dashboard' 
            AND permissions ? 'bookings'
            AND permissions ? 'customers'
            AND permissions ? 'inventory'
        ) THEN 'PASS - Permissions structure is correct'
        ELSE 'FAIL - Permissions structure is incorrect'
    END as result;

-- Check if indexes were created
SELECT 
    'Indexes check' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'users' 
            AND indexname = 'idx_users_permissions'
        ) THEN 'PASS - Permissions index created'
        ELSE 'FAIL - Permissions index missing'
    END as result;

-- Check if RLS policies exist
SELECT 
    'RLS policies check' as check_name,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE tablename = 'users'
        ) >= 4 THEN 'PASS - RLS policies created'
        ELSE 'FAIL - RLS policies missing'
    END as result;

-- Check if audit table exists
SELECT 
    'Audit table check' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'user_permission_audit'
        ) THEN 'PASS - Audit table exists'
        ELSE 'FAIL - Audit table missing'
    END as result;

-- Check if helper functions exist
SELECT 
    'Helper functions check' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.routines 
            WHERE routine_name = 'check_user_permission'
        ) AND EXISTS (
            SELECT 1 
            FROM information_schema.routines 
            WHERE routine_name = 'get_user_permissions'
        ) AND EXISTS (
            SELECT 1 
            FROM information_schema.routines 
            WHERE routine_name = 'update_user_permissions'
        ) THEN 'PASS - All helper functions exist'
        ELSE 'FAIL - Some helper functions missing'
    END as result;

-- Display user summary with permissions
SELECT 
    u.name,
    u.email,
    u.role,
    u.is_active,
    f.name as franchise_name,
    (
        SELECT COUNT(*)
        FROM jsonb_each_text(u.permissions) 
        WHERE value = 'true'
    ) as active_permissions_count,
    u.permissions
FROM users u
LEFT JOIN franchises f ON u.franchise_id = f.id
ORDER BY u.role, u.name;

-- Test permission functions
SELECT 
    'Permission function test' as test_name,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'admin@safawala.com' LIMIT 1),
        'dashboard'
    ) as dashboard_permission,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'admin@safawala.com' LIMIT 1),
        'franchises'
    ) as franchises_permission;
