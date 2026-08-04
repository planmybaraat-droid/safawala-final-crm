-- Fix the barcode index issue by removing the unique constraint and index
-- The barcode field was causing issues due to large data URL sizes

-- Drop the existing unique constraint and index on barcode if they exist
DO $$
BEGIN
    -- Drop unique constraint on barcode if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'products' AND constraint_name = 'products_barcode_key'
    ) THEN
        ALTER TABLE products DROP CONSTRAINT products_barcode_key;
        RAISE NOTICE 'Dropped unique constraint on barcode column';
    END IF;

    -- Drop index on barcode if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' AND indexname = 'products_barcode_key'
    ) THEN
        DROP INDEX products_barcode_key;
        RAISE NOTICE 'Dropped index on barcode column';
    END IF;

    -- Drop any other barcode indexes
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' AND indexname = 'idx_products_barcode'
    ) THEN
        DROP INDEX idx_products_barcode;
        RAISE NOTICE 'Dropped idx_products_barcode index';
    END IF;

    -- Ensure barcode column is TEXT type without constraints
    ALTER TABLE products ALTER COLUMN barcode TYPE TEXT;
    
    -- Make sure barcode column allows NULL values
    ALTER TABLE products ALTER COLUMN barcode DROP NOT NULL;
    
    RAISE NOTICE 'Updated barcode column to TEXT without constraints';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing barcode index: %', SQLERRM;
END $$;

-- Create a simple index on product_code instead (which is much smaller)
CREATE INDEX IF NOT EXISTS idx_products_product_code_barcode ON products(product_code) 
WHERE barcode IS NOT NULL;

-- Add a comment explaining the barcode storage strategy
COMMENT ON COLUMN products.barcode IS 'Stores barcode identifier (product_code) - actual barcode images are generated on-demand to avoid storage issues';

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'barcode';

-- Show any remaining indexes on the products table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'products' 
ORDER BY indexname;
