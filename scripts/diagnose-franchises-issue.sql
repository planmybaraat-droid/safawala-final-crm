-- Diagnostic queries to check franchises issue

-- 1. Check if franchises table exists and has data
SELECT 'Franchises count:' as info, COUNT(*) as count FROM franchises;

-- 2. Check actual franchise data
SELECT 'First 5 franchises:' as info;
SELECT 
    id, 
    name, 
    code, 
    city, 
    state, 
    owner_name, 
    is_active, 
    created_at 
FROM franchises 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check current user's role
SELECT 'Current user info:' as info;
SELECT 
    id, 
    email, 
    role, 
    franchise_id 
FROM users 
WHERE id = auth.uid();

-- 4. Check if RLS is enabled on franchises table
SELECT 'RLS status:' as info;
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'franchises';

-- 5. Check RLS policies on franchises table
SELECT 'RLS policies:' as info;
SELECT 
    policyname, 
    cmd, 
    qual::text as using_expression, 
    with_check::text as check_expression
FROM pg_policies 
WHERE tablename = 'franchises';

-- 6. Test the actual query that the app is running
SELECT 'App query test:' as info;
SELECT * FROM franchises ORDER BY created_at DESC;
