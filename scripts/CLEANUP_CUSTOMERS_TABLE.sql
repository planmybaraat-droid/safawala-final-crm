-- =============================================
-- COMPREHENSIVE CLEANUP: Remove Unused Columns from Customers Table
-- =============================================
-- Purpose: Remove all unused columns to simplify the customers table
-- Date: 2025-10-24
-- BACKUP YOUR DATA BEFORE RUNNING THIS!

-- Step 1: Drop all unused columns
DO $$ 
BEGIN
    RAISE NOTICE '🧹 Starting cleanup of customers table...';
    
    -- Drop soft delete columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'deleted_at') THEN
        ALTER TABLE customers DROP COLUMN deleted_at;
        RAISE NOTICE '✅ Dropped deleted_at';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'deleted_by') THEN
        ALTER TABLE customers DROP COLUMN deleted_by;
        RAISE NOTICE '✅ Dropped deleted_by';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delete_reason') THEN
        ALTER TABLE customers DROP COLUMN delete_reason;
        RAISE NOTICE '✅ Dropped delete_reason';
    END IF;
    
    -- Drop is_active (replaced by hard deletes)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_active') THEN
        DROP INDEX IF EXISTS idx_customers_is_active;
        DROP INDEX IF EXISTS idx_customers_franchise_active;
        ALTER TABLE customers DROP COLUMN is_active;
        RAISE NOTICE '✅ Dropped is_active and related indexes';
    END IF;
    
    -- Drop unused business logic columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'gst_number') THEN
        ALTER TABLE customers DROP COLUMN gst_number;
        RAISE NOTICE '✅ Dropped gst_number';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_bookings') THEN
        ALTER TABLE customers DROP COLUMN total_bookings;
        RAISE NOTICE '✅ Dropped total_bookings (calculated on-the-fly)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_spent') THEN
        ALTER TABLE customers DROP COLUMN total_spent;
        RAISE NOTICE '✅ Dropped total_spent (calculated on-the-fly)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_booking_date') THEN
        ALTER TABLE customers DROP COLUMN last_booking_date;
        RAISE NOTICE '✅ Dropped last_booking_date (calculated on-the-fly)';
    END IF;
    
    -- Drop not-yet-implemented features
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'area') THEN
        ALTER TABLE customers DROP COLUMN area;
        RAISE NOTICE '✅ Dropped area';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'assigned_staff_id') THEN
        ALTER TABLE customers DROP COLUMN assigned_staff_id;
        RAISE NOTICE '✅ Dropped assigned_staff_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_contact_date') THEN
        ALTER TABLE customers DROP COLUMN last_contact_date;
        RAISE NOTICE '✅ Dropped last_contact_date';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
        ALTER TABLE customers DROP COLUMN status;
        RAISE NOTICE '✅ Dropped status (redundant)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'notes') THEN
        ALTER TABLE customers DROP COLUMN notes;
        RAISE NOTICE '✅ Dropped notes (removed from UI)';
    END IF;
    
    RAISE NOTICE '🎉 Cleanup complete!';
END $$;

-- Step 2: Show the cleaned table structure
SELECT 
    '========== CUSTOMERS TABLE STRUCTURE (AFTER CLEANUP) ==========' as info;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Show remaining indexes
SELECT 
    '========== REMAINING INDEXES ==========' as info;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'customers'
AND schemaname = 'public'
ORDER BY indexname;

-- Step 4: Show customer count
SELECT 
    '========== CUSTOMER COUNT ==========' as info,
    COUNT(*) as total_customers,
    COUNT(DISTINCT franchise_id) as total_franchises
FROM customers;

-- Step 5: Summary of what should remain
SELECT 
    '========== EXPECTED COLUMNS (SHOULD BE 15) ==========' as info;

/*
REMAINING COLUMNS (15 total):
✅ id                    - UUID primary key
✅ customer_code         - Unique code (CUS-0001, etc.)
✅ name                  - Customer name
✅ phone                 - Primary phone
✅ whatsapp              - WhatsApp number
✅ email                 - Email address
✅ address               - Full address
✅ city                  - City name
✅ state                 - State name
✅ pincode               - PIN code
✅ franchise_id          - Franchise reference
✅ created_at            - Creation timestamp
✅ updated_at            - Update timestamp
✅ created_by            - Creator user ID
✅ updated_by            - Last updater user ID
*/

SELECT COUNT(*) as actual_column_count 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public';
