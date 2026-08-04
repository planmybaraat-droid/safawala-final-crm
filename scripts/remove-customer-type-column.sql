-- Remove customer_type column and its check constraint from customers table
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE customers DROP COLUMN IF EXISTS customer_type;

-- Update any existing queries or views that might reference customer_type
-- (This script handles the database schema cleanup)

-- Verify the column has been removed
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;
