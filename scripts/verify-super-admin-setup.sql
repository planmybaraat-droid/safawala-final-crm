-- ============================================================
-- QUICK VERIFICATION SCRIPT - Run this after RLS setup
-- ============================================================

-- 1. Check your user role
SELECT '==== YOUR USER INFO ====' as section;
SELECT 
    email,
    role,
    franchise_id,
    created_at
FROM users 
WHERE id = auth.uid();

-- 2. Count franchises
SELECT '==== FRANCHISES COUNT ====' as section;
SELECT COUNT(*) as total_franchises FROM franchises;
SELECT COUNT(*) as active_franchises FROM franchises WHERE is_active = true;

-- 3. Show first 3 franchises
SELECT '==== FIRST 3 FRANCHISES ====' as section;
SELECT 
    id,
    name,
    code,
    city,
    owner_name,
    is_active
FROM franchises 
ORDER BY created_at DESC 
LIMIT 3;

-- 4. Check RLS is enabled
SELECT '==== RLS STATUS ====' as section;
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('franchises', 'users', 'customers', 'bookings', 'products', 'invoices')
ORDER BY tablename;

-- 5. Count super admin policies
SELECT '==== SUPER ADMIN POLICIES ====' as section;
SELECT 
    COUNT(*) as total_super_admin_policies
FROM pg_policies 
WHERE policyname LIKE '%super_admin%';

-- 6. Show super admin policies on key tables
SELECT '==== POLICIES ON KEY TABLES ====' as section;
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE policyname LIKE '%super_admin%'
GROUP BY tablename
ORDER BY tablename;

-- 7. Test data access (should return counts for all tables)
SELECT '==== DATA ACCESS TEST ====' as section;
SELECT 'customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'bookings' as table_name, COUNT(*) as count FROM bookings
UNION ALL
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'invoices' as table_name, COUNT(*) as count FROM invoices
UNION ALL
SELECT 'expenses' as table_name, COUNT(*) as count FROM expenses
UNION ALL
SELECT 'staff' as table_name, COUNT(*) as count FROM staff;

-- 8. Final status
SELECT '==== FINAL STATUS ====' as section;
SELECT 
    CASE 
        WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin' 
        AND (SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE '%super_admin%') > 20
        AND (SELECT COUNT(*) FROM franchises WHERE is_active = true) > 0
        THEN '✅ ALL CHECKS PASSED - Super Admin RLS is configured correctly!'
        ELSE '❌ SOME CHECKS FAILED - Review the output above'
    END as status;
