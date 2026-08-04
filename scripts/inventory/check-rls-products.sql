-- ============================================
-- CHECK RLS POLICIES ON PRODUCTS TABLE
-- Run this in Supabase SQL Editor to diagnose RLS issues
-- ============================================

-- 1. Check if RLS is enabled on products table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'products';

-- 2. List all RLS policies on products table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'products';

-- 3. Check if products exist for mysafawale@gmail.com (bypass RLS using service role)
SELECT 
    'DIRECT PRODUCT CHECK (bypassing RLS)' as section,
    COUNT(*) as total_products
FROM products p
JOIN users u ON p.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND p.is_active = true;

-- 4. List sample products (first 5)
SELECT 
    'SAMPLE PRODUCTS' as section,
    p.product_code,
    p.name,
    p.brand,
    p.is_active,
    p.franchise_id,
    u.email as franchise_email
FROM products p
JOIN users u ON p.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY p.created_at DESC
LIMIT 5;

-- 5. If RLS is blocking, temporarily disable it for testing
-- UNCOMMENT BELOW LINE ONLY IF RLS IS THE ISSUE:
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 6. After testing, re-enable RLS (IMPORTANT!)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
