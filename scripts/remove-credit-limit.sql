-- Remove credit_limit column from customers table
ALTER TABLE customers DROP COLUMN IF EXISTS credit_limit;

-- Update any views or functions that might reference credit_limit
-- (Add any additional cleanup queries if needed)
