-- Fix products table schema to match the expected structure

DO $$ 
BEGIN
    -- Add product_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'product_code') THEN
        ALTER TABLE products ADD COLUMN product_code VARCHAR(50) UNIQUE;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'description') THEN
        ALTER TABLE products ADD COLUMN description TEXT;
    END IF;
    
    -- Add barcode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'barcode') THEN
        ALTER TABLE products ADD COLUMN barcode VARCHAR(100);
    END IF;
    
    -- Add brand column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'brand') THEN
        ALTER TABLE products ADD COLUMN brand VARCHAR(100);
    END IF;
    
    -- Add color column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'color') THEN
        ALTER TABLE products ADD COLUMN color VARCHAR(50);
    END IF;
    
    -- Add material column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'material') THEN
        ALTER TABLE products ADD COLUMN material VARCHAR(100);
    END IF;
    
    -- Add cost_price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2);
    END IF;
    
    -- Add security_deposit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'security_deposit') THEN
        ALTER TABLE products ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add stock_booked column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_booked') THEN
        ALTER TABLE products ADD COLUMN stock_booked INTEGER DEFAULT 0;
    END IF;
    
    -- Add stock_damaged column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_damaged') THEN
        ALTER TABLE products ADD COLUMN stock_damaged INTEGER DEFAULT 0;
    END IF;
    
    -- Add stock_in_laundry column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_in_laundry') THEN
        ALTER TABLE products ADD COLUMN stock_in_laundry INTEGER DEFAULT 0;
    END IF;
    
    -- Add reorder_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'reorder_level') THEN
        ALTER TABLE products ADD COLUMN reorder_level INTEGER DEFAULT 5;
    END IF;
    
    -- Add damage_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'damage_count') THEN
        ALTER TABLE products ADD COLUMN damage_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Ensure franchise_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'franchise_id') THEN
        ALTER TABLE products ADD COLUMN franchise_id UUID REFERENCES franchises(id);
    END IF;
END $$;

-- Generate product codes for existing products without codes using a subquery approach
WITH numbered_products AS (
    SELECT id, category, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM products 
    WHERE product_code IS NULL
)
UPDATE products 
SET product_code = UPPER(SUBSTRING(np.category FROM 1 FOR 3)) || LPAD(np.row_num::TEXT, 3, '0')
FROM numbered_products np
WHERE products.id = np.id;

-- Calculate stock_booked from stock_total - stock_available using a subquery approach
UPDATE products 
SET stock_booked = GREATEST(0, stock_total - stock_available)
WHERE stock_booked IS NULL;

-- Set default values for new columns
UPDATE products SET 
    stock_damaged = COALESCE(stock_damaged, 0),
    stock_in_laundry = COALESCE(stock_in_laundry, 0),
    reorder_level = COALESCE(reorder_level, 5),
    damage_count = COALESCE(damage_count, 0),
    is_active = COALESCE(is_active, true),
    security_deposit = COALESCE(security_deposit, 0)
WHERE stock_damaged IS NULL OR stock_in_laundry IS NULL OR reorder_level IS NULL 
   OR damage_count IS NULL OR is_active IS NULL OR security_deposit IS NULL;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
