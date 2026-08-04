-- ============================================================
-- COMPLETE RLS POLICIES FOR SUPER ADMIN ACCESS
-- This script grants super admin full access to all CRM tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, disable RLS temporarily to clean up
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all existing policies on key tables
    FOR r IN (
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'franchises', 'users', 'user_profiles', 'products', 'bookings', 
            'customers', 'invoices', 'expenses', 'expense_categories',
            'staff', 'attendance', 'payroll', 'packages', 'package_variants',
            'services', 'booking_items', 'product_items', 'distance_pricing',
            'company_settings', 'branding_settings', 'banking_details',
            'audit_logs', 'deliveries', 'laundry_bookings'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================
-- FRANCHISES TABLE
-- ============================================================
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_franchises" ON franchises
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    )
    WITH CHECK (
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

-- ============================================================
-- USERS TABLE
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
    )
    WITH CHECK (
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
-- USER_PROFILES TABLE
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_profiles" ON user_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "users_own_profile" ON user_profiles
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_customers" ON customers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_customers" ON customers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = customers.franchise_id
        )
    );

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_products" ON products
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_products" ON products
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = products.franchise_id
        )
    );

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_bookings" ON bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_bookings" ON bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = bookings.franchise_id
        )
    );

-- ============================================================
-- BOOKING_ITEMS TABLE
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
-- INVOICES TABLE
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_invoices" ON invoices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_invoices" ON invoices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = invoices.franchise_id
        )
    );

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_expenses" ON expenses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_expenses" ON expenses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = expenses.franchise_id
        )
    );

-- ============================================================
-- EXPENSE_CATEGORIES TABLE
-- ============================================================
DO $$
BEGIN
    ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
    
    -- Super admin gets full access
    EXECUTE 'CREATE POLICY "super_admin_full_access_expense_categories" ON expense_categories
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = ''super_admin''
            )
        )';
    
    -- Check if franchise_id column exists before creating franchise policy
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expense_categories' 
        AND column_name = 'franchise_id'
    ) THEN
        EXECUTE 'CREATE POLICY "franchise_users_own_expense_categories" ON expense_categories
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.franchise_id = expense_categories.franchise_id
                )
            )';
    ELSE
        -- If no franchise_id, allow all authenticated users to see all categories
        EXECUTE 'CREATE POLICY "all_users_expense_categories" ON expense_categories
            FOR SELECT
            USING (auth.uid() IS NOT NULL)';
    END IF;
END $$;

-- ============================================================
-- STAFF TABLE
-- ============================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_staff" ON staff
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_staff" ON staff
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = staff.franchise_id
        )
    );

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_attendance" ON attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_attendance" ON attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff
            JOIN users ON users.id = auth.uid()
            WHERE staff.id = attendance.staff_id
            AND users.franchise_id = staff.franchise_id
        )
    );

-- ============================================================
-- PAYROLL TABLE
-- ============================================================
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_payroll" ON payroll
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_payroll" ON payroll
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff
            JOIN users ON users.id = auth.uid()
            WHERE staff.id = payroll.staff_id
            AND users.franchise_id = staff.franchise_id
        )
    );

-- ============================================================
-- PACKAGES TABLE
-- ============================================================
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_packages" ON packages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_packages" ON packages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = packages.franchise_id
        )
    );

-- ============================================================
-- PACKAGE_VARIANTS TABLE (if exists)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'package_variants') THEN
        ALTER TABLE package_variants ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_package_variants" ON package_variants
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "franchise_users_own_package_variants" ON package_variants
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM packages
                    JOIN users ON users.id = auth.uid()
                    WHERE packages.id = package_variants.package_id
                    AND users.franchise_id = packages.franchise_id
                )
            )';
    END IF;
END $$;

-- ============================================================
-- SERVICES TABLE
-- ============================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_services" ON services
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_services" ON services
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = services.franchise_id
        )
    );

-- ============================================================
-- PRODUCT_ITEMS TABLE
-- ============================================================
ALTER TABLE product_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_product_items" ON product_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_product_items" ON product_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM products
            JOIN users ON users.id = auth.uid()
            WHERE products.id = product_items.product_id
            AND users.franchise_id = products.franchise_id
        )
    );

-- ============================================================
-- DISTANCE_PRICING TABLE
-- ============================================================
ALTER TABLE distance_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_distance_pricing" ON distance_pricing
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_distance_pricing" ON distance_pricing
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = distance_pricing.franchise_id
        )
    );

-- ============================================================
-- COMPANY_SETTINGS TABLE
-- ============================================================
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_company_settings" ON company_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_company_settings" ON company_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = company_settings.franchise_id
        )
    );

-- ============================================================
-- BRANDING_SETTINGS TABLE
-- ============================================================
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_branding_settings" ON branding_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_branding_settings" ON branding_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = branding_settings.franchise_id
        )
    );

-- ============================================================
-- BANKING_DETAILS TABLE
-- ============================================================
ALTER TABLE banking_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_banking_details" ON banking_details
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "franchise_users_own_banking_details" ON banking_details
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = banking_details.franchise_id
        )
    );

-- ============================================================
-- AUDIT_LOGS TABLE (if exists)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_audit_logs" ON audit_logs
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "franchise_users_own_audit_logs" ON audit_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.franchise_id = audit_logs.franchise_id
                )
            )';
    END IF;
END $$;

-- ============================================================
-- DELIVERIES TABLE (if exists)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deliveries') THEN
        ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_deliveries" ON deliveries
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "franchise_users_own_deliveries" ON deliveries
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM bookings
                    JOIN users ON users.id = auth.uid()
                    WHERE bookings.id = deliveries.booking_id
                    AND users.franchise_id = bookings.franchise_id
                )
            )';
    END IF;
END $$;

-- ============================================================
-- LAUNDRY_BOOKINGS TABLE (if exists)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'laundry_bookings') THEN
        ALTER TABLE laundry_bookings ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "super_admin_full_access_laundry_bookings" ON laundry_bookings
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = ''super_admin''
                )
            )';
        
        EXECUTE 'CREATE POLICY "franchise_users_own_laundry_bookings" ON laundry_bookings
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.franchise_id = laundry_bookings.franchise_id
                )
            )';
    END IF;
END $$;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'franchises', 'users', 'user_profiles', 'products', 'bookings', 
    'customers', 'invoices', 'expenses', 'staff', 'packages', 'services'
)
ORDER BY tablename;

-- Check policies for key tables
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN policyname LIKE '%super_admin%' THEN 'Super Admin'
        WHEN policyname LIKE '%franchise%' THEN 'Franchise User'
        ELSE 'Other'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policy_type;

-- Verify your user has super_admin role
SELECT 
    email,
    role,
    franchise_id,
    created_at
FROM users 
WHERE id = auth.uid();

SELECT '✅ RLS policies created successfully for super admin!' as status;
