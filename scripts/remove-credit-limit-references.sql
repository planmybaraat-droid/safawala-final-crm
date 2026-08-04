-- Script to clean up any remaining credit_limit references in database
-- Remove credit_limit column if it exists (though it shouldn't based on current schema)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'credit_limit'
    ) THEN
        ALTER TABLE customers DROP COLUMN credit_limit;
        RAISE NOTICE 'credit_limit column removed from customers table';
    ELSE
        RAISE NOTICE 'credit_limit column does not exist in customers table';
    END IF;
END $$;

-- Verify the customers table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
