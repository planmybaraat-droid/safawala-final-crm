-- ============================================================
-- MIGRATE EXISTING DATA TO FRANCHISES
-- Run this AFTER adding franchise_id columns
-- This assigns existing data to appropriate franchises
-- ============================================================

-- ⚠️ IMPORTANT: Review this script before running!
-- This will assign NULL franchise_id records to franchises

-- ============================================================
-- SECTION 1: Identify Orphaned Data
-- ============================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 ORPHANED DATA ANALYSIS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Customers without franchise
SELECT 'customers' as table_name, COUNT(*) as orphaned_records
FROM customers WHERE franchise_id IS NULL
UNION ALL
-- Products without franchise
SELECT 'products', COUNT(*) 
FROM products WHERE franchise_id IS NULL
UNION ALL
-- Bookings without franchise
SELECT 'bookings', COUNT(*) 
FROM bookings WHERE franchise_id IS NULL
UNION ALL
-- Invoices without franchise
SELECT 'invoices', COUNT(*) 
FROM invoices WHERE franchise_id IS NULL
UNION ALL
-- Expenses without franchise
SELECT 'expenses', COUNT(*) 
FROM expenses WHERE franchise_id IS NULL
UNION ALL
-- Staff without franchise
SELECT 'staff', COUNT(*) 
FROM staff WHERE franchise_id IS NULL
ORDER BY orphaned_records DESC;

-- ============================================================
-- SECTION 2: Get Available Franchises
-- ============================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🏢 AVAILABLE FRANCHISES' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    id,
    code,
    name,
    city,
    created_at
FROM franchises
ORDER BY code;

-- ============================================================
-- SECTION 3: Migration Strategy Options
-- ============================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🎯 MIGRATION STRATEGY - CHOOSE ONE' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- OPTION A: Assign all orphaned data to HQ franchise
-- Use this if super admin should manage existing data

-- First, get HQ franchise ID
DO $$
DECLARE
    hq_franchise_id UUID;
BEGIN
    -- Get HQ franchise ID
    SELECT id INTO hq_franchise_id 
    FROM franchises 
    WHERE code = 'HQ001' OR name ILIKE '%headquarters%'
    LIMIT 1;
    
    IF hq_franchise_id IS NOT NULL THEN
        RAISE NOTICE '✅ Found HQ Franchise: %', hq_franchise_id;
        RAISE NOTICE '📝 This will be used for migration';
    ELSE
        RAISE NOTICE '❌ HQ Franchise not found! Create it first using QUICK_HQ_SETUP.sql';
    END IF;
END $$;

-- ============================================================
-- SECTION 4: EXECUTE MIGRATION (OPTION A - Assign to HQ)
-- ============================================================

-- ⚠️ UNCOMMENT THE SECTION BELOW AFTER REVIEWING

/*
DO $$
DECLARE
    hq_franchise_id UUID;
    customers_updated INTEGER;
    products_updated INTEGER;
    bookings_updated INTEGER;
    invoices_updated INTEGER;
    expenses_updated INTEGER;
    staff_updated INTEGER;
BEGIN
    -- Get HQ franchise ID
    SELECT id INTO hq_franchise_id 
    FROM franchises 
    WHERE code = 'HQ001' 
    LIMIT 1;
    
    IF hq_franchise_id IS NULL THEN
        RAISE EXCEPTION 'HQ franchise not found! Create it first.';
    END IF;
    
    RAISE NOTICE '🏢 Using HQ Franchise: %', hq_franchise_id;
    
    -- Migrate Customers
    UPDATE customers 
    SET franchise_id = hq_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS customers_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % customers to HQ', customers_updated;
    
    -- Migrate Products
    UPDATE products 
    SET franchise_id = hq_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS products_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % products to HQ', products_updated;
    
    -- Migrate Bookings
    UPDATE bookings 
    SET franchise_id = hq_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS bookings_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % bookings to HQ', bookings_updated;
    
    -- Migrate Invoices
    UPDATE invoices 
    SET franchise_id = hq_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS invoices_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % invoices to HQ', invoices_updated;
    
    -- Migrate Expenses
    UPDATE expenses 
    SET franchise_id = hq_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS expenses_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % expenses to HQ', expenses_updated;
    
    -- Migrate Staff
    UPDATE staff 
    SET franchise_id = hq_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS staff_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % staff to HQ', staff_updated;
    
    RAISE NOTICE '🎉 Migration complete!';
    RAISE NOTICE 'Total records migrated: %', 
        customers_updated + products_updated + bookings_updated + 
        invoices_updated + expenses_updated + staff_updated;
END $$;
*/

-- ============================================================
-- SECTION 5: EXECUTE MIGRATION (OPTION B - Assign to First Franchise)
-- ============================================================

-- Use this if you want to assign to the first franchise instead of HQ

/*
DO $$
DECLARE
    first_franchise_id UUID;
    customers_updated INTEGER;
    products_updated INTEGER;
    bookings_updated INTEGER;
    invoices_updated INTEGER;
    expenses_updated INTEGER;
    staff_updated INTEGER;
BEGIN
    -- Get first franchise ID
    SELECT id INTO first_franchise_id 
    FROM franchises 
    WHERE code != 'HQ001'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_franchise_id IS NULL THEN
        RAISE EXCEPTION 'No franchise found!';
    END IF;
    
    RAISE NOTICE '🏢 Using Franchise: %', first_franchise_id;
    
    -- Migrate Customers
    UPDATE customers 
    SET franchise_id = first_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS customers_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % customers', customers_updated;
    
    -- Migrate Products
    UPDATE products 
    SET franchise_id = first_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS products_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % products', products_updated;
    
    -- Migrate Bookings
    UPDATE bookings 
    SET franchise_id = first_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS bookings_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % bookings', bookings_updated;
    
    -- Migrate Invoices
    UPDATE invoices 
    SET franchise_id = first_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS invoices_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % invoices', invoices_updated;
    
    -- Migrate Expenses
    UPDATE expenses 
    SET franchise_id = first_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS expenses_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % expenses', expenses_updated;
    
    -- Migrate Staff
    UPDATE staff 
    SET franchise_id = first_franchise_id 
    WHERE franchise_id IS NULL;
    GET DIAGNOSTICS staff_updated = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % staff', staff_updated;
    
    RAISE NOTICE '🎉 Migration complete!';
END $$;
*/

-- ============================================================
-- SECTION 6: Verify Migration
-- ============================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ VERIFICATION - Check Remaining NULL Records' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- After migration, this should show 0 for all tables
SELECT 'customers' as table_name, COUNT(*) as null_franchise_records
FROM customers WHERE franchise_id IS NULL
UNION ALL
SELECT 'products', COUNT(*) 
FROM products WHERE franchise_id IS NULL
UNION ALL
SELECT 'bookings', COUNT(*) 
FROM bookings WHERE franchise_id IS NULL
UNION ALL
SELECT 'invoices', COUNT(*) 
FROM invoices WHERE franchise_id IS NULL
UNION ALL
SELECT 'expenses', COUNT(*) 
FROM expenses WHERE franchise_id IS NULL
UNION ALL
SELECT 'staff', COUNT(*) 
FROM staff WHERE franchise_id IS NULL
ORDER BY null_franchise_records DESC;

-- Show distribution across franchises
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 DATA DISTRIBUTION BY FRANCHISE' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    f.code,
    f.name,
    COUNT(DISTINCT c.id) as customers,
    COUNT(DISTINCT p.id) as products,
    COUNT(DISTINCT b.id) as bookings,
    COUNT(DISTINCT i.id) as invoices,
    COUNT(DISTINCT e.id) as expenses,
    COUNT(DISTINCT s.id) as staff
FROM franchises f
LEFT JOIN customers c ON c.franchise_id = f.id
LEFT JOIN products p ON p.franchise_id = f.id
LEFT JOIN bookings b ON b.franchise_id = f.id
LEFT JOIN invoices i ON i.franchise_id = f.id
LEFT JOIN expenses e ON e.franchise_id = f.id
LEFT JOIN staff s ON s.franchise_id = f.id
GROUP BY f.id, f.code, f.name
ORDER BY f.code;

SELECT '🎉 If all null_franchise_records = 0, migration is complete!' as final_status;
