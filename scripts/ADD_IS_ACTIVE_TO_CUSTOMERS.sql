-- Add is_active column to customers table for soft delete functionality
-- This allows marking customers as inactive without permanently deleting them

-- Add the column with default value TRUE (all existing customers are active)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Add index for better query performance when filtering by is_active
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Add index for combined franchise and active status queries
CREATE INDEX IF NOT EXISTS idx_customers_franchise_active ON customers(franchise_id, is_active);

-- Update any NULL values to TRUE (safety check)
UPDATE customers 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Add helpful comment
COMMENT ON COLUMN customers.is_active IS 'Soft delete flag - FALSE means customer is inactive/deleted';

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customers' 
AND column_name = 'is_active';

-- Show sample data
SELECT 
    id,
    name,
    phone,
    is_active,
    created_at
FROM customers
ORDER BY created_at DESC
LIMIT 5;

-- Summary
SELECT 
    is_active,
    COUNT(*) as customer_count
FROM customers
GROUP BY is_active
ORDER BY is_active DESC;

/*
EXPECTED RESULTS:
1. Column 'is_active' added with type BOOLEAN, default TRUE
2. Indexes created for performance
3. All existing customers marked as active (is_active = TRUE)
4. Ready to use in the edit customer dialog

USAGE:
- Create customer: is_active defaults to TRUE
- Edit customer: Can toggle between active/inactive
- List customers: Filter by is_active = TRUE to show only active ones
*/
