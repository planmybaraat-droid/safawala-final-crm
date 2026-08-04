-- ============================================================
-- ADD MISSING franchise_id COLUMNS
-- Run this AFTER reviewing the audit results
-- ============================================================

-- This script will add franchise_id to tables that need it
-- Run each section based on your audit results

-- ============================================================
-- SECTION 1: Core Business Tables
-- ============================================================

-- Customers (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE customers 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to customers';
    ELSE
        RAISE NOTICE '⏭️  customers already has franchise_id';
    END IF;
END $$;

-- Products (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to products';
    ELSE
        RAISE NOTICE '⏭️  products already has franchise_id';
    END IF;
END $$;

-- Bookings (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to bookings';
    ELSE
        RAISE NOTICE '⏭️  bookings already has franchise_id';
    END IF;
END $$;

-- Invoices (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to invoices';
    ELSE
        RAISE NOTICE '⏭️  invoices already has franchise_id';
    END IF;
END $$;

-- Expenses (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE expenses 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to expenses';
    ELSE
        RAISE NOTICE '⏭️  expenses already has franchise_id';
    END IF;
END $$;

-- Staff (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE staff 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to staff';
    ELSE
        RAISE NOTICE '⏭️  staff already has franchise_id';
    END IF;
END $$;

-- ============================================================
-- SECTION 2: Secondary Tables
-- ============================================================

-- Services (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE services 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to services';
    ELSE
        RAISE NOTICE '⏭️  services already has franchise_id';
    END IF;
END $$;

-- Packages (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packages' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE packages 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to packages';
    ELSE
        RAISE NOTICE '⏭️  packages already has franchise_id';
    END IF;
END $$;

-- Distance Pricing (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'distance_pricing' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE distance_pricing 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to distance_pricing';
    ELSE
        RAISE NOTICE '⏭️  distance_pricing already has franchise_id';
    END IF;
END $$;

-- User Profiles (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'franchise_id'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        
        RAISE NOTICE '✅ Added franchise_id to user_profiles';
    ELSE
        RAISE NOTICE '⏭️  user_profiles already has franchise_id';
    END IF;
END $$;

-- ============================================================
-- SECTION 3: Settings Tables  
-- ============================================================

-- Company Settings (check column name first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'company_settings' AND column_name = 'franchise_id'
        ) THEN
            ALTER TABLE company_settings 
            ADD COLUMN franchise_id UUID REFERENCES franchises(id);
            
            RAISE NOTICE '✅ Added franchise_id to company_settings';
        ELSE
            RAISE NOTICE '⏭️  company_settings already has franchise_id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  company_settings table does not exist';
    END IF;
END $$;

-- Branding Settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branding_settings') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'branding_settings' AND column_name = 'franchise_id'
        ) THEN
            ALTER TABLE branding_settings 
            ADD COLUMN franchise_id UUID REFERENCES franchises(id);
            
            RAISE NOTICE '✅ Added franchise_id to branding_settings';
        ELSE
            RAISE NOTICE '⏭️  branding_settings already has franchise_id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  branding_settings table does not exist';
    END IF;
END $$;

-- Banking Details
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banking_details') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'banking_details' AND column_name = 'franchise_id'
        ) THEN
            ALTER TABLE banking_details 
            ADD COLUMN franchise_id UUID REFERENCES franchises(id);
            
            RAISE NOTICE '✅ Added franchise_id to banking_details';
        ELSE
            RAISE NOTICE '⏭️  banking_details already has franchise_id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  banking_details table does not exist';
    END IF;
END $$;

-- ============================================================
-- SECTION 4: Add Indexes for Performance
-- ============================================================

-- Create indexes on franchise_id for all tables
DO $$
DECLARE
    tables_to_index text[] := ARRAY[
        'customers', 'products', 'bookings', 'invoices', 
        'expenses', 'staff', 'services', 'packages',
        'distance_pricing', 'user_profiles', 'company_settings',
        'branding_settings', 'banking_details'
    ];
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY tables_to_index
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = tbl AND column_name = 'franchise_id'
        ) THEN
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_%s_franchise_id 
                ON %I(franchise_id)
            ', tbl, tbl);
            
            RAISE NOTICE '✅ Created index on %.franchise_id', tbl;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ MIGRATION COMPLETE - VERIFICATION' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Count tables with franchise_id
SELECT 
    COUNT(*) as tables_with_franchise_id,
    string_agg(table_name, ', ' ORDER BY table_name) as table_names
FROM information_schema.columns 
WHERE column_name = 'franchise_id'
AND table_schema = 'public';

-- Check indexes created
SELECT 
    tablename,
    indexname,
    '✅ Index exists' as status
FROM pg_indexes 
WHERE indexname LIKE '%franchise_id%'
ORDER BY tablename;

SELECT '🎉 Migration complete! All tables now have franchise_id column and indexes.' as final_status;
