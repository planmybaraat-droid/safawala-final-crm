-- ============================================
-- FIX PRODUCTS TABLE: Add Missing Columns
-- This ensures the products table matches what the API expects
-- ============================================

-- Step 1: Add missing columns to products table
DO $$ 
BEGIN
    -- rental_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'rental_price') THEN
        ALTER TABLE products ADD COLUMN rental_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added rental_price column';
    ELSE
        RAISE NOTICE 'ℹ️  rental_price column already exists';
    END IF;
    
    -- sale_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_price') THEN
        ALTER TABLE products ADD COLUMN sale_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added sale_price column';
    ELSE
        RAISE NOTICE 'ℹ️  sale_price column already exists';
    END IF;
    
    -- security_deposit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'security_deposit') THEN
        ALTER TABLE products ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added security_deposit column';
    ELSE
        RAISE NOTICE 'ℹ️  security_deposit column already exists';
    END IF;
    
    -- stock_available column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_available') THEN
        ALTER TABLE products ADD COLUMN stock_available INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added stock_available column';
    ELSE
        RAISE NOTICE 'ℹ️  stock_available column already exists';
    END IF;
    
    -- product_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_code') THEN
        ALTER TABLE products ADD COLUMN product_code VARCHAR(50);
        RAISE NOTICE '✅ Added product_code column';
    ELSE
        RAISE NOTICE 'ℹ️  product_code column already exists';
    END IF;
    
    -- description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'description') THEN
        ALTER TABLE products ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column';
    ELSE
        RAISE NOTICE 'ℹ️  description column already exists';
    END IF;
    
    -- franchise_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'franchise_id') THEN
        ALTER TABLE products ADD COLUMN franchise_id UUID REFERENCES franchises(id);
        RAISE NOTICE '✅ Added franchise_id column';
    ELSE
        RAISE NOTICE 'ℹ️  franchise_id column already exists';
    END IF;
    
    -- is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added is_active column';
    ELSE
        RAISE NOTICE 'ℹ️  is_active column already exists';
    END IF;
    
    -- category_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id UUID;
        RAISE NOTICE '✅ Added category_id column';
    ELSE
        RAISE NOTICE 'ℹ️  category_id column already exists';
    END IF;
    
    -- image_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
        RAISE NOTICE '✅ Added image_url column';
    ELSE
        RAISE NOTICE 'ℹ️  image_url column already exists';
    END IF;
    
    -- stock_quantity column (original)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added stock_quantity column';
    ELSE
        RAISE NOTICE 'ℹ️  stock_quantity column already exists';
    END IF;
    
    RAISE NOTICE '✅ All standard columns verified for products table';
END $$;

-- Step 2: Update existing products to have default stock quantities
UPDATE products 
SET stock_quantity = 10 
WHERE stock_quantity IS NULL OR stock_quantity = 0;

-- Step 3: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_franchise ON products(franchise_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Step 4: Show current products table structure
SELECT 
    '========== PRODUCTS TABLE STRUCTURE ==========' as info,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Count products by franchise
SELECT 
    '========== PRODUCTS BY FRANCHISE ==========' as info,
    f.name as franchise_name,
    f.code,
    COUNT(p.id) as product_count
FROM franchises f
LEFT JOIN products p ON p.franchise_id = f.id
GROUP BY f.id, f.name, f.code
ORDER BY product_count DESC;

-- Success message
SELECT '✅✅✅ Products table fix complete! Custom product creation should work now.' as result;
