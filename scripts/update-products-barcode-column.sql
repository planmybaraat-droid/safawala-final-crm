-- Update products table to handle barcode storage properly
-- This script fixes the column types and constraints for better data handling

-- First, let's check if the products table exists and see its structure
DO $$
BEGIN
    -- Add barcode column if it doesn't exist, or modify it if it does
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'barcode'
    ) THEN
        -- Column exists, modify it to handle longer values
        ALTER TABLE products ALTER COLUMN barcode TYPE TEXT;
        RAISE NOTICE 'Modified existing barcode column to TEXT type';
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE products ADD COLUMN barcode TEXT;
        RAISE NOTICE 'Added new barcode column as TEXT type';
    END IF;

    -- Ensure product_code column exists and has proper constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'product_code'
    ) THEN
        ALTER TABLE products ADD COLUMN product_code VARCHAR(50);
        RAISE NOTICE 'Added product_code column';
    END IF;

    -- Add unique constraint on product_code if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'products' AND constraint_name = 'products_product_code_unique'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_product_code_unique UNIQUE (product_code);
        RAISE NOTICE 'Added unique constraint on product_code';
    END IF;

    -- Ensure other columns have proper types and lengths
    -- Update name column to handle longer names
    ALTER TABLE products ALTER COLUMN name TYPE VARCHAR(255);
    
    -- Update brand column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'brand'
    ) THEN
        ALTER TABLE products ALTER COLUMN brand TYPE VARCHAR(100);
    END IF;

    -- Update size column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'size'
    ) THEN
        ALTER TABLE products ALTER COLUMN size TYPE VARCHAR(50);
    END IF;

    -- Update color column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'color'
    ) THEN
        ALTER TABLE products ALTER COLUMN color TYPE VARCHAR(50);
    END IF;

    -- Update material column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'material'
    ) THEN
        ALTER TABLE products ALTER COLUMN material TYPE VARCHAR(100);
    END IF;

    -- Update description column to TEXT for longer descriptions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'description'
    ) THEN
        ALTER TABLE products ALTER COLUMN description TYPE TEXT;
    END IF;

    RAISE NOTICE 'Products table schema updated successfully';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating products table: %', SQLERRM;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_franchise_id ON products(franchise_id);

-- Add comments for documentation
COMMENT ON COLUMN products.barcode IS 'Stores barcode data - can be product code or full barcode data URL';
COMMENT ON COLUMN products.product_code IS 'Unique product identifier used for barcode generation';
COMMENT ON COLUMN products.name IS 'Product name (max 255 characters)';
COMMENT ON COLUMN products.brand IS 'Product brand (max 100 characters)';
COMMENT ON COLUMN products.size IS 'Product size (max 50 characters)';
COMMENT ON COLUMN products.color IS 'Product color (max 50 characters)';
COMMENT ON COLUMN products.material IS 'Product material (max 100 characters)';
COMMENT ON COLUMN products.description IS 'Detailed product description (unlimited length)';

-- Show the updated table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
