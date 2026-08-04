-- ============================================
-- QUICK TEST: Verify mysafawale@gmail.com sees only their customers
-- Run this in Supabase SQL Editor
-- ============================================

-- Test 1: Show franchise info
SELECT 
    '=== YOUR FRANCHISE ===' as test,
    u.email,
    u.name as user_name,
    f.name as franchise_name,
    f.code as franchise_code,
    f.id as franchise_id
FROM users u
JOIN franchises f ON f.id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com';

-- Test 2: Count YOUR customers
SELECT 
    '=== YOUR CUSTOMERS ===' as test,
    COUNT(*) as your_customer_count
FROM customers c
JOIN users u ON u.franchise_id = c.franchise_id
WHERE u.email = 'mysafawale@gmail.com';

-- Test 3: List YOUR customers
SELECT 
    '=== YOUR CUSTOMER LIST ===' as test,
    c.name,
    c.phone,
    c.email,
    c.created_at::date as created_date
FROM customers c
JOIN users u ON u.franchise_id = c.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY c.created_at DESC
LIMIT 10;

-- Test 4: Compare with ALL franchises (to verify isolation)
SELECT 
    '=== ALL FRANCHISES COMPARISON ===' as test,
    f.name as franchise_name,
    f.code,
    COUNT(c.id) as customer_count,
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE email = 'mysafawale@gmail.com' AND franchise_id = f.id) 
        THEN '👈 YOUR FRANCHISE' 
        ELSE '' 
    END as yours
FROM franchises f
LEFT JOIN customers c ON c.franchise_id = f.id
GROUP BY f.id, f.name, f.code
ORDER BY customer_count DESC;
