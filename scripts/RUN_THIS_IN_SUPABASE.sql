-- ============================================================
-- STEP-BY-STEP: Copy and paste this ENTIRE file into Supabase
-- ============================================================

-- First, let's see what tables exist
SELECT 'Tables in your database:' as info;
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Now clean up existing policies
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
END $$;

-- Helper function to create policies
CREATE OR REPLACE FUNCTION create_super_admin_policy(table_name text, has_franchise_id boolean DEFAULT true)
RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    EXECUTE format('
        CREATE POLICY "super_admin_full_access_%s" ON %I
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = ''super_admin''
            )
        )', table_name, table_name);
    
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
            )', table_name, table_name, table_name);
    ELSE
        EXECUTE format('
            CREATE POLICY "authenticated_read_%s" ON %I
            FOR SELECT
            USING (auth.uid() IS NOT NULL)', table_name, table_name);
    END IF;
    
    RAISE NOTICE '✅ Created policies for: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- Franchises table (special case)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'franchises') THEN
        ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_franchises" ON franchises
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "franchise_users_own_franchise" ON franchises
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.franchise_id = franchises.id
                )
            )';
        
        RAISE NOTICE '✅ Created policies for: franchises';
    END IF;
END $$;

-- Users table (special case)
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
        
        RAISE NOTICE '✅ Created policies for: users';
    END IF;
END $$;

-- All other tables
DO $$
DECLARE
    tables_to_process text[] := ARRAY[
        'customers', 'products', 'bookings', 'invoices', 'expenses', 
        'staff', 'services', 'distance_pricing', 'company_settings',
        'branding_settings', 'banking_details', 'user_profiles',
        'booking_items', 'product_items', 'attendance', 'payroll'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables_to_process
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            PERFORM create_super_admin_policy(t, true);
        END IF;
    END LOOP;
END $$;

-- Expense categories (might not have franchise_id)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'expense_categories' AND column_name = 'franchise_id'
        ) THEN
            PERFORM create_super_admin_policy('expense_categories', true);
        ELSE
            PERFORM create_super_admin_policy('expense_categories', false);
        END IF;
    END IF;
END $$;

-- Cleanup
DROP FUNCTION IF EXISTS create_super_admin_policy(text, boolean);

-- Show what was created
SELECT '✅ POLICIES CREATED:' as status;
SELECT 
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
AND policyname LIKE '%super_admin%'
GROUP BY tablename
ORDER BY tablename;

-- Verify your role
SELECT '✅ YOUR USER INFO:' as status;
SELECT email, role, franchise_id FROM users WHERE id = auth.uid();

SELECT '🎉 SUCCESS! RLS policies created for super admin!' as final_status;
