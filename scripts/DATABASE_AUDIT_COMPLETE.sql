-- ============================================================
-- COMPLETE DATABASE AUDIT FOR FRANCHISE ISOLATION
-- Checks all tables for franchise_id column and structure
-- ============================================================

-- Step 1: List all tables in the database
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 ALL TABLES IN DATABASE' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 2: Check which tables have franchise_id
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ TABLES WITH franchise_id COLUMN' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    t.tablename,
    c.column_name,
    c.data_type,
    c.is_nullable,
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN '✅ Has FK'
        ELSE '⚠️  No FK'
    END as has_foreign_key
FROM pg_tables t
LEFT JOIN information_schema.columns c 
    ON c.table_name = t.tablename 
    AND c.column_name = 'franchise_id'
LEFT JOIN information_schema.key_column_usage kcu
    ON kcu.table_name = t.tablename 
    AND kcu.column_name = 'franchise_id'
LEFT JOIN information_schema.table_constraints tc
    ON tc.constraint_name = kcu.constraint_name
WHERE t.schemaname = 'public'
    AND c.column_name = 'franchise_id'
ORDER BY t.tablename;

-- Step 3: Check which tables DON'T have franchise_id
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '❌ TABLES MISSING franchise_id COLUMN' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    t.tablename,
    CASE 
        WHEN t.tablename IN ('users', 'franchises', 'audit_logs') THEN '✅ System table (OK)'
        WHEN t.tablename LIKE '%_migration%' THEN '✅ Migration table (OK)'
        ELSE '⚠️  Needs franchise_id'
    END as status,
    CASE 
        WHEN t.tablename IN ('users', 'franchises', 'audit_logs') THEN 'System table - franchise_id optional'
        WHEN t.tablename LIKE '%_migration%' THEN 'Migration table - skip'
        ELSE '→ ALTER TABLE ' || t.tablename || ' ADD COLUMN franchise_id UUID REFERENCES franchises(id);'
    END as action_needed
FROM pg_tables t
WHERE t.schemaname = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_name = t.tablename 
        AND c.column_name = 'franchise_id'
    )
    AND t.tablename NOT IN (
        'schema_migrations',
        'spatial_ref_sys',
        '_prisma_migrations'
    )
ORDER BY 
    CASE 
        WHEN t.tablename IN ('users', 'franchises', 'audit_logs') THEN 0
        WHEN t.tablename LIKE '%_migration%' THEN 0
        ELSE 1
    END,
    t.tablename;

-- Step 4: Check key business tables specifically
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🎯 KEY BUSINESS TABLES STATUS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

WITH key_tables AS (
    SELECT unnest(ARRAY[
        'customers', 'products', 'bookings', 'booking_items',
        'invoices', 'expenses', 'expense_categories',
        'staff', 'attendance', 'payroll',
        'services', 'packages', 'package_variants',
        'deliveries', 'product_items', 'distance_pricing',
        'company_settings', 'branding_settings', 'banking_details',
        'user_profiles'
    ]) as table_name
)
SELECT 
    kt.table_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ Has franchise_id'
        WHEN t.tablename IS NULL THEN '❌ Table does not exist'
        ELSE '⚠️  Missing franchise_id'
    END as status,
    c.data_type,
    c.is_nullable,
    CASE 
        WHEN c.column_name IS NULL AND t.tablename IS NOT NULL THEN 
            'ALTER TABLE ' || kt.table_name || ' ADD COLUMN franchise_id UUID REFERENCES franchises(id);'
        ELSE ''
    END as migration_needed
FROM key_tables kt
LEFT JOIN pg_tables t ON t.tablename = kt.table_name AND t.schemaname = 'public'
LEFT JOIN information_schema.columns c 
    ON c.table_name = kt.table_name 
    AND c.column_name = 'franchise_id'
ORDER BY 
    CASE 
        WHEN c.column_name IS NOT NULL THEN 0
        WHEN t.tablename IS NULL THEN 2
        ELSE 1
    END,
    kt.table_name;

-- Step 5: Check franchises table structure
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🏢 FRANCHISES TABLE STRUCTURE' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'franchises'
ORDER BY ordinal_position;

-- Step 6: Count records per table
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 RECORD COUNTS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

DO $$
DECLARE
    r RECORD;
    row_count INTEGER;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN (
            'franchises', 'users', 'customers', 'products', 
            'bookings', 'invoices', 'expenses', 'staff'
        )
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', r.tablename) INTO row_count;
        RAISE NOTICE '% → % records', r.tablename, row_count;
    END LOOP;
END $$;

-- Step 7: Check RLS status
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔒 RLS (Row Level Security) STATUS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '⚠️  Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'franchises', 'users', 'customers', 'products', 
    'bookings', 'invoices', 'expenses', 'staff',
    'services', 'packages', 'company_settings'
)
ORDER BY tablename;

-- Step 8: Check super admin policies count
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🛡️  SUPER ADMIN POLICIES COUNT' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE policyname LIKE '%super_admin%'
GROUP BY tablename
ORDER BY tablename;

-- Step 9: Summary
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📋 AUDIT SUMMARY' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

WITH 
key_tables AS (
    SELECT unnest(ARRAY[
        'customers', 'products', 'bookings', 'invoices', 
        'expenses', 'staff', 'services'
    ]) as table_name
),
table_status AS (
    SELECT 
        kt.table_name,
        CASE 
            WHEN c.column_name IS NOT NULL THEN 1 
            ELSE 0 
        END as has_franchise_id,
        CASE 
            WHEN pt.rowsecurity THEN 1 
            ELSE 0 
        END as has_rls,
        CASE 
            WHEN pp.policyname IS NOT NULL THEN 1 
            ELSE 0 
        END as has_policy
    FROM key_tables kt
    LEFT JOIN information_schema.columns c 
        ON c.table_name = kt.table_name AND c.column_name = 'franchise_id'
    LEFT JOIN pg_tables pt 
        ON pt.tablename = kt.table_name AND pt.schemaname = 'public'
    LEFT JOIN pg_policies pp 
        ON pp.tablename = kt.table_name AND pp.policyname LIKE '%super_admin%'
)
SELECT 
    COUNT(*) as total_tables,
    SUM(has_franchise_id) as tables_with_franchise_id,
    SUM(has_rls) as tables_with_rls,
    SUM(CASE WHEN has_policy > 0 THEN 1 ELSE 0 END) as tables_with_policies,
    CASE 
        WHEN SUM(has_franchise_id) = COUNT(*) 
        AND SUM(has_rls) = COUNT(*) 
        AND SUM(CASE WHEN has_policy > 0 THEN 1 ELSE 0 END) = COUNT(*)
        THEN '✅ ALL READY FOR FRANCHISE ISOLATION'
        ELSE '⚠️  NEEDS SETUP'
    END as overall_status
FROM table_status;

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🎯 Next Step: Review tables missing franchise_id and run migrations' as next_action;
