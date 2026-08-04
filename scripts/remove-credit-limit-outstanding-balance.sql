-- Remove credit_limit and outstanding_balance references from customers table
-- This script ensures the database schema matches the code expectations

-- First, check if the columns exist and remove them if they do
DO $$ 
BEGIN
    -- Remove credit_limit column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
        ALTER TABLE customers DROP COLUMN credit_limit;
        RAISE NOTICE 'Removed credit_limit column from customers table';
    END IF;
    
    -- Remove outstanding_balance column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'customers' AND column_name = 'outstanding_balance') THEN
        ALTER TABLE customers DROP COLUMN outstanding_balance;
        RAISE NOTICE 'Removed outstanding_balance column from customers table';
    END IF;
END $$;
