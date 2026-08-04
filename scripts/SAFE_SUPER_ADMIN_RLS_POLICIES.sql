-- ============================================================
-- SAFE RLS POLICIES FOR SUPER ADMIN - HANDLES MISSING COLUMNS
-- Run this version if the main script has errors
-- ============================================================

-- First, clean up existing policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'franchises', 'users', 'user_profiles', 'products', 'bookings', 
            'customers', 'invoices', 'expenses', 'expense_categories',
            'staff', 'attendance', 'payroll', 'packages', 'services',
            'booking_items', 'product_items', 'distance_pricing',
            'company_settings', 'branding_settings', 'banking_details'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================
-- HELPER FUNCTION TO CREATE POLICIES SAFELY
-- ============================================================
CREATE OR REPLACE FUNCTION create_super_admin_policy(table_name text, has_franchise_id boolean DEFAULT true)
RETURNS void AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Super admin full access
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
    
    -- Franchise-specific policy if table has franchise_id
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
        -- Global table - all authenticated users can read
        EXECUTE format('
            CREATE POLICY "authenticated_read_%s" ON %I
            FOR SELECT
            USING (auth.uid() IS NOT NULL)', table_name, table_name);
    END IF;
    
    RAISE NOTICE '✅ Created policies for: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CREATE POLICIES FOR ALL TABLES
-- ============================================================

-- FRANCHISES TABLE - Special case (users.franchise_id points to franchises.id)
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_franchises" ON franchises
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_franchise" ON franchises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = franchises.id
        )
    );

-- Tables with franchise_id column (check if they exist first)
DO $$
BEGIN
    -- Customers
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
        PERFORM create_super_admin_policy('customers', true);
    END IF;
    
    -- Products
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        PERFORM create_super_admin_policy('products', true);
    END IF;
    
    -- Bookings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
        PERFORM create_super_admin_policy('bookings', true);
    END IF;
    
    -- Invoices
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        PERFORM create_super_admin_policy('invoices', true);
    END IF;
    
    -- Expenses
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
        PERFORM create_super_admin_policy('expenses', true);
    END IF;
    
    -- Staff
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
        PERFORM create_super_admin_policy('staff', true);
    END IF;
    
    -- Packages (might not exist)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'packages') THEN
        PERFORM create_super_admin_policy('packages', true);
    END IF;
    
    -- Services
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN
        PERFORM create_super_admin_policy('services', true);
    END IF;
    
    -- Product Items
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_items') THEN
        PERFORM create_super_admin_policy('product_items', false);
    END IF;
    
    -- Distance Pricing
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'distance_pricing') THEN
        PERFORM create_super_admin_policy('distance_pricing', true);
    END IF;
    
    -- Company Settings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_settings') THEN
        PERFORM create_super_admin_policy('company_settings', true);
    END IF;
    
    -- Branding Settings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'branding_settings') THEN
        PERFORM create_super_admin_policy('branding_settings', true);
    END IF;
    
    -- Banking Details
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'banking_details') THEN
        PERFORM create_super_admin_policy('banking_details', true);
    END IF;
    
    -- User Profiles
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        PERFORM create_super_admin_policy('user_profiles', true);
    END IF;
END $$;

-- Expense categories might be global (no franchise_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expense_categories' AND column_name = 'franchise_id'
    ) THEN
        PERFORM create_super_admin_policy('expense_categories', true);
    ELSE
        PERFORM create_super_admin_policy('expense_categories', false);
    END IF;
END $$;

-- ============================================================
-- USERS TABLE (Special handling)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.role = 'super_admin'
        )
    );

CREATE POLICY "users_own_record" ON users
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "users_update_own_record" ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================
-- BOOKING_ITEMS (Links to bookings)
-- ============================================================
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_booking_items" ON booking_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_booking_items" ON booking_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM bookings 
            JOIN users ON users.id = auth.uid()
            WHERE bookings.id = booking_items.booking_id
            AND users.franchise_id = bookings.franchise_id
        )
    );

-- ============================================================
-- ATTENDANCE (Links to staff)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'attendance') THEN
        ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_attendance" ON attendance
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "franchise_users_own_attendance" ON attendance
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM staff
                    JOIN users ON users.id = auth.uid()
                    WHERE staff.id = attendance.staff_id
                    AND users.franchise_id = staff.franchise_id
                )
            )';
    END IF;
END $$;

-- ============================================================
-- PAYROLL (Links to staff)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'payroll') THEN
        ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_payroll" ON payroll
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "franchise_users_own_payroll" ON payroll
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM staff
                    JOIN users ON users.id = auth.uid()
                    WHERE staff.id = payroll.staff_id
                    AND users.franchise_id = staff.franchise_id
                )
            )';
    END IF;
END $$;

-- ============================================================
-- CLEANUP
-- ============================================================
DROP FUNCTION IF EXISTS create_super_admin_policy(text, boolean);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 
    '✅ VERIFICATION' as section,
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public'
AND policyname LIKE '%super_admin%'
GROUP BY tablename
ORDER BY tablename;

SELECT '✅ RLS policies created successfully for super admin!' as status;
