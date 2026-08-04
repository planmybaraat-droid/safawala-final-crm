-- ============================================
-- RLS POLICIES FOR CUSTOMERS TABLE (Service Role Pattern)
-- For apps using service role with manual franchise filtering
-- ============================================

-- IMPORTANT NOTE:
-- Your app uses SERVICE ROLE authentication with session cookies,
-- NOT Supabase Auth JWT tokens. This means:
-- 1. RLS policies with auth.uid() will NOT work
-- 2. You need to filter by franchise_id in your API code
-- 3. RLS can be DISABLED for service role pattern

-- ============================================
-- OPTION 1: DISABLE RLS (Recommended for Service Role)
-- ============================================
-- Since your APIs already filter by franchise_id from session,
-- RLS is redundant and can cause issues

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    '========== RLS DISABLED (Service Role Pattern) ==========' as status,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'customers';

-- ============================================
-- SECURITY MODEL FOR YOUR APP:
-- ============================================
-- ✅ Session cookie validation in API routes
-- ✅ Extract franchise_id from session
-- ✅ Manual .eq('franchise_id', franchiseId) in queries
-- ✅ Service role bypasses RLS
-- ✅ Security enforced at API layer

-- Example from your code:
-- const { franchiseId } = await getUserFromSession(request)
-- const { data } = await supabase
--   .from("customers")
--   .select("*")
--   .eq("franchise_id", franchiseId)  // <-- Manual filtering

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- 1. Check current customers for mysafawale@gmail.com franchise
SELECT 
    '========== Customers for mysafawale@gmail.com ==========' as info,
    c.id,
    c.name,
    c.phone,
    c.email,
    f.name as franchise_name
FROM customers c
JOIN users u ON u.franchise_id = c.franchise_id
JOIN franchises f ON f.id = c.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. Verify franchise isolation (should show different counts)
SELECT 
    '========== Customers by Franchise ==========' as info,
    f.name as franchise_name,
    f.code,
    COUNT(c.id) as customer_count
FROM franchises f
LEFT JOIN customers c ON c.franchise_id = f.id
GROUP BY f.id, f.name, f.code
ORDER BY customer_count DESC;

-- 3. Check if all customers have valid franchise_id
SELECT 
    '========== Customers without franchise_id ==========' as warning,
    COUNT(*) as orphaned_customers
FROM customers
WHERE franchise_id IS NULL;

-- If there are orphaned customers, you can assign them:
-- UPDATE customers 
-- SET franchise_id = (SELECT id FROM franchises WHERE code = 'SWL001')
-- WHERE franchise_id IS NULL;
