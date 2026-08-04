-- ============================================================
-- BULLETPROOF RLS SETUP - Checks every column before creating policies
-- ============================================================

-- Clean up all existing policies first
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
    RAISE NOTICE '✅ Cleaned up existing policies';
END $$;

-- ============================================================
-- FRANCHISES TABLE
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'franchises') THEN
        ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
        
        -- Super admin full access
        EXECUTE 'CREATE POLICY "super_admin_full_access_franchises" ON franchises
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        -- Franchise users see their own
        EXECUTE 'CREATE POLICY "franchise_users_own_franchise" ON franchises
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.franchise_id = franchises.id
                )
            )';
        
        RAISE NOTICE '✅ franchises: 2 policies created';
    END IF;
END $$;

-- ============================================================
-- USERS TABLE
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_users" ON users
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = auth.uid() 
                    AND u.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "users_own_record" ON users
            FOR SELECT
            USING (id = auth.uid())';
        
        EXECUTE 'CREATE POLICY "users_update_own_record" ON users
            FOR UPDATE
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid())';
        
        RAISE NOTICE '✅ users: 3 policies created';
    END IF;
END $$;

-- ============================================================
-- HELPER FUNCTION - Creates policies only if column exists
-- ============================================================
CREATE OR REPLACE FUNCTION create_table_policies(
    p_table_name text
)
RETURNS void AS $$
DECLARE
    has_franchise_id boolean;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = p_table_name) THEN
        RAISE NOTICE '⚠️  Table % does not exist - skipping', p_table_name;
        RETURN;
    END IF;
    
    -- Check if table has franchise_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = 'franchise_id'
    ) INTO has_franchise_id;
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- Super admin always gets full access
    EXECUTE format('
        CREATE POLICY "super_admin_full_access_%s" ON %I
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = ''super_admin''
            )
        )', p_table_name, p_table_name);
    
    -- Franchise-specific access only if column exists
    IF has_franchise_id THEN
        EXECUTE format('
            CREATE POLICY "franchise_users_own_%s" ON %I
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.franchise_id = %I.franchise_id
                )
            )', p_table_name, p_table_name, p_table_name);
        RAISE NOTICE '✅ %: 2 policies created (with franchise_id)', p_table_name;
    ELSE
        -- No franchise_id - allow all authenticated users to read
        EXECUTE format('
            CREATE POLICY "authenticated_read_%s" ON %I
            FOR SELECT
            USING (auth.uid() IS NOT NULL)', p_table_name, p_table_name);
        RAISE NOTICE '✅ %: 2 policies created (global table)', p_table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CREATE POLICIES FOR ALL TABLES
-- ============================================================
DO $$
DECLARE
    tables_list text[] := ARRAY[
        'customers',
        'products', 
        'bookings',
        'invoices',
        'expenses',
        'expense_categories',
        'staff',
        'services',
        'product_items',
        'booking_items',
        'distance_pricing',
        'company_settings',
        'branding_settings',
        'banking_details',
        'user_profiles',
        'attendance',
        'payroll',
        'packages',
        'package_variants',
        'deliveries',
        'laundry_bookings'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables_list
    LOOP
        PERFORM create_table_policies(t);
    END LOOP;
END $$;

-- ============================================================
-- SPECIAL HANDLING FOR BOOKING_ITEMS (links to bookings)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'booking_items') THEN
        -- Drop the auto-created policy
        EXECUTE 'DROP POLICY IF EXISTS "franchise_users_own_booking_items" ON booking_items';
        
        -- Create better policy that joins through bookings
        EXECUTE 'CREATE POLICY "franchise_users_own_booking_items" ON booking_items
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM bookings 
                    JOIN users ON users.id = auth.uid()
                    WHERE bookings.id = booking_items.booking_id
                    AND users.franchise_id = bookings.franchise_id
                )
            )';
        RAISE NOTICE '✅ booking_items: Updated policy to join through bookings';
    END IF;
END $$;

-- ============================================================
-- CLEANUP
-- ============================================================
DROP FUNCTION IF EXISTS create_table_policies(text);

-- ============================================================
-- SHOW RESULTS
-- ============================================================
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ RLS POLICIES CREATED' as status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    tablename,
    COUNT(*) as policies,
    string_agg(
        CASE 
            WHEN policyname LIKE '%super_admin%' THEN '🔓 Super Admin'
            WHEN policyname LIKE '%franchise%' THEN '🏢 Franchise'
            ELSE '👤 User'
        END, 
        ', ' 
        ORDER BY policyname
    ) as types
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '👤 YOUR USER INFO' as status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    email,
    role,
    CASE 
        WHEN role = 'super_admin' THEN '✅ Super Admin Access Granted'
        ELSE '⚠️  Not Super Admin - Limited Access'
    END as access_level,
    franchise_id
FROM users 
WHERE id = auth.uid();

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🎉 SUCCESS! Super Admin RLS Setup Complete!' as final_status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
