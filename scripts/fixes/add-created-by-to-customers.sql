-- ============================================
-- FIX: Add missing created_by column to customers table
-- This column tracks which user created the customer
-- ============================================

-- Step 1: Check if column exists
SELECT 
    '========== Checking for created_by column ==========' as status,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'created_by'
        AND table_schema = 'public'
    ) as column_exists;

-- Step 2: Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'created_by'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE customers 
        ADD COLUMN created_by UUID REFERENCES users(id);
        
        RAISE NOTICE 'Added created_by column to customers table';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;
END $$;

-- Step 3: Optionally set created_by for existing customers to their franchise admin
-- (This updates NULL created_by values to the first admin of that franchise)
UPDATE customers c
SET created_by = (
    SELECT u.id 
    FROM users u 
    WHERE u.franchise_id = c.franchise_id 
    AND u.role IN ('franchise_admin', 'super_admin')
    ORDER BY u.created_at ASC 
    LIMIT 1
)
WHERE c.created_by IS NULL;

-- Step 4: Verify the column was added
SELECT 
    '========== Verification ==========' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'created_by'
AND table_schema = 'public';

-- Step 5: Show sample customers with created_by
SELECT 
    '========== Sample Customers with created_by ==========' as status,
    c.name as customer_name,
    u.name as created_by_user,
    u.email as created_by_email,
    c.created_at
FROM customers c
LEFT JOIN users u ON u.id = c.created_by
ORDER BY c.created_at DESC
LIMIT 5;
