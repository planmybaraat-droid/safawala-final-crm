-- Add customer_code column to customers table
-- This script adds the missing customer_code column that is used throughout the UI

-- Step 1: Add the column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_code TEXT;

-- Step 2: Generate customer codes for existing customers using a subquery approach
-- Format: CUST-YYYYMM-XXXX (e.g., CUST-202410-0001)
WITH numbered_customers AS (
  SELECT 
    id,
    'CUST-' || TO_CHAR(created_at, 'YYYYMM') || '-' || 
    LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') AS new_code
  FROM customers
  WHERE customer_code IS NULL
)
UPDATE customers 
SET customer_code = numbered_customers.new_code
FROM numbered_customers
WHERE customers.id = numbered_customers.id;

-- Step 3: Create unique index for customer_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_customer_code 
ON customers(customer_code) 
WHERE customer_code IS NOT NULL;

-- Step 4: Add NOT NULL constraint (optional - only if all customers should have codes)
-- ALTER TABLE customers 
-- ALTER COLUMN customer_code SET NOT NULL;

-- Step 5: Verify the results
SELECT 
  COUNT(*) as total_customers,
  COUNT(customer_code) as customers_with_codes,
  COUNT(*) - COUNT(customer_code) as customers_without_codes
FROM customers;

-- Step 6: Show sample customer codes
SELECT 
  id,
  customer_code,
  name,
  created_at
FROM customers
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: View updated table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND column_name IN ('id', 'customer_code', 'name', 'phone', 'email', 'created_at')
ORDER BY ordinal_position;
