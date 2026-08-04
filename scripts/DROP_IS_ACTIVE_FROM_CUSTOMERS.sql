-- =============================================
-- DROP UNNECESSARY COLUMNS FROM CUSTOMERS TABLE
-- =============================================
-- Purpose: Remove the is_active column since we're not using soft deletes
-- Date: 2025-10-24

-- Step 1: Check if is_active column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'is_active'
    ) THEN
        RAISE NOTICE '✅ is_active column found - will be dropped';
        
        -- Drop the indexes first
        DROP INDEX IF EXISTS idx_customers_is_active;
        DROP INDEX IF EXISTS idx_customers_franchise_active;
        
        -- Drop the column
        ALTER TABLE customers DROP COLUMN is_active;
        
        RAISE NOTICE '✅ is_active column and related indexes dropped successfully';
    ELSE
        RAISE NOTICE 'ℹ️  is_active column does not exist';
    END IF;
END $$;

-- Step 2: Show current table structure after cleanup
SELECT 
    '========== CUSTOMERS TABLE STRUCTURE (AFTER CLEANUP) ==========' as info,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Verify indexes
SELECT 
    '========== CUSTOMERS TABLE INDEXES ==========' as info,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'customers'
AND schemaname = 'public'
ORDER BY indexname;

-- Step 4: Show customer count
SELECT 
    '========== CUSTOMER COUNT ==========' as info,
    COUNT(*) as total_customers
FROM customers;

RAISE NOTICE '✅ Cleanup complete! is_active column removed from customers table';
