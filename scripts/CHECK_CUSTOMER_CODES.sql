-- Check if all customers have customer_codes assigned

-- Step 1: Count customers with and without codes
SELECT 
  COUNT(*) as total_customers,
  COUNT(customer_code) as customers_with_codes,
  COUNT(*) FILTER (WHERE customer_code IS NULL OR customer_code = '') as customers_without_codes
FROM customers;

-- Step 2: Show customers missing customer_code (if any)
SELECT 
  id,
  name,
  phone,
  email,
  customer_code,
  created_at
FROM customers
WHERE customer_code IS NULL OR customer_code = ''
LIMIT 20;

-- Step 3: Show sample customer codes to verify format
SELECT 
  customer_code,
  name,
  phone,
  created_at
FROM customers
WHERE customer_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
