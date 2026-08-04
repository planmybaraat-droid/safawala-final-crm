-- Remove payment_method column and related constraints from expenses table
-- This eliminates the payment_method_check constraint that was causing errors

-- Drop the check constraint first
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- Drop the payment_method column
ALTER TABLE expenses DROP COLUMN IF EXISTS payment_method;

-- Drop the payment_methods table if it exists (no longer needed)
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Add a comment to track this change
COMMENT ON TABLE expenses IS 'Expenses table - payment_method field removed to eliminate constraint issues';
